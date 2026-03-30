/**
 * 📚 서재 활동 백필 스크립트 (1회성)
 *
 * 목적:
 * - 리스너 도입 전에, 서재(포럼) 전체 스레드/메시지를 전수 스캔
 * - 유효 활동(Preview/Review/프리뷰/리뷰 시작 또는 1000자 이상)만
 * - 중복은 백엔드 ack(sourceId 유니크)로 자동 스킵
 * - 발생 시각 기준(year/month)으로 백엔드 집계에 반영 (occurredAt)
 *
 * 실행:
 *   npx ts-node src/scripts/backfillLibraryActivity.ts
 *
 * 필요 env:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - DISCORD_LIBRARY_CHANNEL_ID (서재 포럼 채널 ID)  또는 BOOKS_CHANNEL_ID
 * - BACKEND_API_URL (예: http://localhost:3000 또는 http://backend:3000)
 * - BOT_INTERNAL_SECRET (백엔드와 공유)
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
import dotenv from 'dotenv';
import { getLibraryParentChannelId, isValidLibraryMessage } from '../lib/libraryActivity';
import { pushLibraryActivityToBackend } from '../lib/pushLibraryActivity';

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAllForumThreads(channel: ForumChannel): Promise<ThreadChannel[]> {
  const all: ThreadChannel[] = [];

  const active = await channel.threads.fetchActive().catch(() => null);
  if (active) all.push(...active.threads.values());

  // archived pagination: use before cursor
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

    // rate-limit 완화
    await sleep(350);
  }

  // 중복 제거
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
      console.log(`✅ backfill 시작 (bot: ${client.user?.tag})`);
      const guild = await client.guilds.fetch(GUILD_ID);
      const ch = await guild.channels.fetch(libraryParentId);
      if (!ch) throw new Error(`서재 채널을 찾지 못했습니다: ${libraryParentId}`);
      if (ch.type !== ChannelType.GuildForum) {
        throw new Error(`서재 채널이 포럼이 아닙니다. type=${ch.type}`);
      }

      const forum = ch as ForumChannel;
      const threads = await fetchAllForumThreads(forum);
      console.log(`🧵 스레드 수: ${threads.length}`);

      let pushed = 0;
      let skippedBots = 0;
      let validMessages = 0;

      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        const ownerId = thread.ownerId ?? null;

        // 1) 포스트(스레드) 생성 자체를 활동으로 반영 (ownerId가 있을 때)
        if (ownerId) {
          await pushLibraryActivityToBackend({
            discordUserId: ownerId,
            sourceId: `thread:${thread.id}`,
            kind: 'thread',
            occurredAt: new Date(thread.createdTimestamp ?? Date.now()).toISOString(),
          });
          pushed++;
        }

        // 2) 스레드 내 메시지들 중 유효 메시지 반영
        const msgs = await fetchAllThreadMessages(thread);
        for (const msg of msgs) {
          if (msg.author?.bot) {
            skippedBots++;
            continue;
          }
          if (!isValidLibraryMessage(msg.content)) continue;

          validMessages++;
          await pushLibraryActivityToBackend({
            discordUserId: msg.author.id,
            sourceId: `msg:${msg.id}`,
            kind: 'message',
            occurredAt: new Date(msg.createdTimestamp).toISOString(),
          });
          pushed++;
        }

        if ((i + 1) % 10 === 0) {
          console.log(
            `…진행 ${i + 1}/${threads.length} | pushed=${pushed} | validMessages=${validMessages}`,
          );
        }

        // thread 단위로 잠깐 쉬어서 레이트리밋 완화
        await sleep(400);
      }

      console.log('✅ backfill 완료');
      console.log({
        threads: threads.length,
        pushed,
        validMessages,
        skippedBots,
      });
    } finally {
      client.destroy();
    }
  });

  await client.login(BOT_TOKEN);
}

void main();

