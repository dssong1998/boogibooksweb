/**
 * 📣 서재(포럼) 전체 포스트에 ROLE_REGULAR 멘션 메시지 전송 후 즉시 삭제 (1회성)
 *
 * 요구사항:
 * - 서재의 모든 post(포럼 스레드)에 대해 .env 내 ROLE_REGULAR를 언급하는 메세지를 보내고
 *   해당 메세지를 바로 다시 지운다.
 *
 * 실행:
 *   npx ts-node src/scripts/mentionRegularInAllLibraryPosts.ts
 *
 * 필요 env:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - LIBRARY_CHANNEL_ID (없으면 BOOKS_CHANNEL_ID)
 * - ROLE_REGULAR (역할 ID, 숫자)
 */

import {
  ChannelType,
  Client,
  ForumChannel,
  GatewayIntentBits,
  ThreadChannel,
  type Collection,
} from 'discord.js';
import dotenv from 'dotenv';
import { getLibraryParentChannelId } from '../lib/libraryActivity';

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ROLE_REGULAR = (process.env.ROLE_REGULAR || '').trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

async function main() {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN 미설정');
  if (!GUILD_ID) throw new Error('DISCORD_GUILD_ID 미설정');
  const libraryParentId = getLibraryParentChannelId();
  if (!libraryParentId) throw new Error('LIBRARY_CHANNEL_ID 또는 BOOKS_CHANNEL_ID 미설정');
  if (!ROLE_REGULAR) throw new Error('ROLE_REGULAR 미설정');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    try {
      console.log(`✅ mention+delete 시작 (bot: ${client.user?.tag})`);
      const guild = await client.guilds.fetch(GUILD_ID);
      const ch = await guild.channels.fetch(libraryParentId);
      if (!ch) throw new Error(`서재 채널을 찾지 못했습니다: ${libraryParentId}`);
      if (ch.type !== ChannelType.GuildForum) {
        throw new Error(`서재 채널이 포럼이 아닙니다. type=${ch.type}`);
      }
      const forum = ch as ForumChannel;
      const threads = await fetchAllForumThreads(forum);
      console.log(`🧵 포스트 수: ${threads.length}`);

      const body = `<@&${ROLE_REGULAR}> 여러분께 전송되는 새 책 추가 알림입니다.`;

      let sent = 0;
      let deleted = 0;
      let failed = 0;

      for (let i = 0; i < threads.length; i++) {
        const t = threads[i];
        try {
          const msg = await t.send(body);
          sent++;
          await msg.delete().catch(() => null);
          deleted++;
        } catch (e) {
          failed++;
          console.error('전송/삭제 실패:', t.id, t.name, e);
        }

        if ((i + 1) % 20 === 0) {
          console.log(`…진행 ${i + 1}/${threads.length} | sent=${sent} deleted=${deleted} failed=${failed}`);
        }

        // 레이트리밋 완화
        await sleep(450);
      }

      console.log('✅ 완료', { threads: threads.length, sent, deleted, failed });
    } finally {
      client.destroy();
    }
  });

  await client.login(BOT_TOKEN);
}

void main();

