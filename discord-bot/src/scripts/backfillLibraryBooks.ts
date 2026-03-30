/**
 * 📚 서재 포럼 전체 → Book/Comment 백필 (1회성)
 *
 * - 서재(포럼) 전체 스레드(Active+Archived 전체 페이지)를 훑습니다.
 * - 스레드 1개 = Book 1개 생성 (discordThreadId에 thread.id 저장)
 * - 스레드 내 모든 메시지 = Comment 생성 (discordMessageId에 message.id 저장)
 * - 중복은 백엔드에서 threadId/messageId로 스킵
 *
 * 실행:
 *   npx ts-node src/scripts/backfillLibraryBooks.ts
 *
 * 필요 env:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - DISCORD_LIBRARY_CHANNEL_ID (없으면 BOOKS_CHANNEL_ID 사용)
 * - BACKEND_API_URL
 */

import {
  ChannelType,
  Client,
  ForumChannel,
  GatewayIntentBits,
  ThreadChannel,
  type Collection,
  type Message,
} from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { getLibraryParentChannelId } from '../lib/libraryActivity';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseThreadTitle(name: string): { title: string; author: string } {
  const raw = (name || '').trim();
  if (!raw) return { title: '제목 없음', author: '작가 미상' };

  if (raw.includes(',')) {
    const parts = raw.split(',');
    const t = parts[0]?.trim() || raw;
    const a = parts.slice(1).join(',').trim() || '작가 미상';
    return { title: t, author: a };
  }
  if (raw.includes(' - ')) {
    const parts = raw.split(' - ');
    const t = parts[0]?.trim() || raw;
    const a = parts.slice(1).join(' - ').trim() || '작가 미상';
    return { title: t, author: a };
  }
  return { title: raw, author: '작가 미상' };
}

async function fetchAllForumThreads(channel: ForumChannel): Promise<ThreadChannel[]> {
  const all: ThreadChannel[] = [];

  const active = await channel.threads.fetchActive().catch(() => null);
  if (active) all.push(...active.threads.values());

  let before: string | undefined = undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const archived = (await channel.threads
      .fetchArchived({ limit: 100, before })
      .catch(() => null)) as { threads: Collection<string, ThreadChannel> } | null;
    if (!archived) break;

    const batch: ThreadChannel[] = [...archived.threads.values()];
    if (batch.length === 0) break;
    all.push(...batch);

    before = batch[batch.length - 1]?.id;
    if (!before) break;

    await sleep(350);
  }

  const uniq = new Map<string, ThreadChannel>();
  for (const t of all) uniq.set(t.id, t);
  return [...uniq.values()];
}

async function fetchAllThreadMessages(thread: ThreadChannel): Promise<Message[]> {
  const messages: Message[] = [];
  let before: string | undefined = undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = (await thread.messages
      .fetch({ limit: 100, before })
      .catch(() => null)) as Collection<string, Message> | null;
    if (!batch || batch.size === 0) break;

    const arr: Message[] = [...batch.values()];
    messages.push(...arr);
    before = arr[arr.length - 1]?.id;
    if (!before) break;
    await sleep(250);
  }
  return messages;
}

async function seedBookFromThread(thread: ThreadChannel): Promise<{ id: string } | null> {
  const starter = await thread.fetchStarterMessage().catch(() => null);
  const discordUserId = starter?.author?.id || thread.ownerId || '';
  if (!discordUserId) return null;

  const { title, author } = parseThreadTitle(thread.name);
  const description = starter?.content?.trim() || '';

  const res = await axios.post(
    `${BACKEND_URL}/books/seed`,
    {
      discordUserId,
      title,
      author,
      description,
      threadId: thread.id,
    },
    { timeout: 20000 },
  );
  return res.data as { id: string };
}

async function seedComment(bookId: string, msg: Message) {
  if (msg.author?.bot) return;
  const content = (msg.content || '').trim();
  if (!content) return;

  await axios.post(
    `${BACKEND_URL}/comments/seed`,
    {
      bookId,
      discordUserId: msg.author.id,
      content,
      type: 'REVIEW',
      createdAt: new Date(msg.createdTimestamp).toISOString(),
      messageId: msg.id,
    },
    { timeout: 20000 },
  );
}

async function main() {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN 미설정');
  if (!GUILD_ID) throw new Error('DISCORD_GUILD_ID 미설정');

  const libraryParentId = getLibraryParentChannelId();
  if (!libraryParentId) throw new Error('DISCORD_LIBRARY_CHANNEL_ID 또는 BOOKS_CHANNEL_ID 미설정');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once('ready', async () => {
    try {
      console.log(`✅ book/comment backfill 시작 (bot: ${client.user?.tag})`);
      const guild = await client.guilds.fetch(GUILD_ID);
      const ch = await guild.channels.fetch(libraryParentId);
      if (!ch) throw new Error(`서재 채널을 찾지 못했습니다: ${libraryParentId}`);
      if (ch.type !== ChannelType.GuildForum) {
        throw new Error(`서재 채널이 포럼이 아닙니다. type=${ch.type}`);
      }

      const forum = ch as ForumChannel;
      const threads = await fetchAllForumThreads(forum);
      console.log(`🧵 스레드 수: ${threads.length}`);

      let books = 0;
      let comments = 0;

      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        let bookId: string | null = null;
        try {
          const book = await seedBookFromThread(thread);
          if (!book?.id) continue;
          bookId = book.id;
          books++;
        } catch (e) {
          console.error('book seed 실패:', thread.id, thread.name, e);
          continue;
        }

        const msgs = await fetchAllThreadMessages(thread);
        for (const msg of msgs) {
          try {
            await seedComment(bookId, msg);
            comments++;
          } catch (e) {
            // 중복/에러는 무시하고 진행
          }
        }

        if ((i + 1) % 10 === 0) {
          console.log(`…진행 ${i + 1}/${threads.length} | books=${books} | comments=${comments}`);
        }

        await sleep(400);
      }

      console.log('✅ book/comment backfill 완료', { threads: threads.length, books, comments });
    } finally {
      client.destroy();
    }
  });

  await client.login(BOT_TOKEN);
}

void main();

