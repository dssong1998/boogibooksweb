/**
 * 🧪 테스트 채널에 ROLE_REGULAR 멘션 메시지 2종 전송
 *
 * 1) 멘션 메시지 전송(유지)
 * 2) 멘션 메시지 전송 후 즉시 삭제(멱등/권한 확인용)
 *
 * 실행:
 *   npx ts-node src/scripts/testRegularMentionMessages.ts
 *   또는
 *   npm run test:regular-mention
 *
 * 필요 env:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - TEST_CHANNEL_ID (텍스트 채널 ID)
 * - ROLE_REGULAR (역할 ID)
 */

import {
  ChannelType,
  Client,
  GatewayIntentBits,
  TextChannel,
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TEST_CHANNEL_ID = (process.env.TEST_CHANNEL_ID || '').trim();
const ROLE_REGULAR = (process.env.ROLE_REGULAR || '').trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN 미설정');
  if (!GUILD_ID) throw new Error('DISCORD_GUILD_ID 미설정');
  if (!TEST_CHANNEL_ID) throw new Error('TEST_CHANNEL_ID 미설정');
  if (!ROLE_REGULAR) throw new Error('ROLE_REGULAR 미설정');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      const ch = await guild.channels.fetch(TEST_CHANNEL_ID);
      if (!ch || ch.type !== ChannelType.GuildText) {
        throw new Error(`TEST_CHANNEL_ID가 텍스트 채널이 아닙니다. type=${ch?.type}`);
      }

      const text = ch as TextChannel;
      const body = `<@&${ROLE_REGULAR}> 여러분께 전송되는 새 책 추가 알림입니다.`;

      // 1) 유지 메시지
      await text.send(`(테스트1/2) ${body}`);

      // 2) 전송 후 삭제 메시지
      const m = await text.send(`(테스트2/2 · 전송 후 삭제) ${body}`);
      await sleep(800);
      await m.delete();

      console.log('✅ 테스트 메시지 2종 전송 완료');
    } finally {
      client.destroy();
    }
  });

  await client.login(BOT_TOKEN);
}

void main();

