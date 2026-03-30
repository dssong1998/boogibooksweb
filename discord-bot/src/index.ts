import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  ChannelType,
} from 'discord.js';
import dotenv from 'dotenv';
import { handleBookMessage } from './handlers/bookHandler';
import { handleDiggingMessage } from './handlers/diggingHandler';
import {
  trackVoiceActivity,
  initializeVoiceTracking,
} from './handlers/voiceHandler';
import {
  getLibraryParentChannelId,
  isValidLibraryMessage,
} from './lib/libraryActivity';
import { pushLibraryActivityToBackend } from './lib/pushLibraryActivity';

dotenv.config();

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ADMIN_ID1 = process.env.ADMIN_ID1;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ 부기북스 봇 로그인 성공: ${c.user.tag}`);

  if (GUILD_ID) {
    try {
      const guild = await c.guilds.fetch(GUILD_ID);
      await initializeVoiceTracking(guild);
    } catch (error) {
      console.error('❌ 음성 채널 초기화 실패:', error);
    }
  }
});

function getChannelName(channel: Message['channel']): string | null {
  if ('name' in channel && channel.name) {
    return channel.name;
  }
  return null;
}

/** 서재 포럼 스레드 / 서재 텍스트 채널에서 온 메시지인지 */
function isMessageInLibraryChannel(message: Message): boolean {
  const libraryParentId = getLibraryParentChannelId();
  const ch = message.channel;

  if (ch.isThread()) {
    return libraryParentId ? ch.parentId === libraryParentId : false;
  }

  const booksId = process.env.BOOKS_CHANNEL_ID;
  if (booksId && ch.id === booksId) return true;
  if (libraryParentId && ch.id === libraryParentId) return true;

  const channelName = getChannelName(ch);
  return channelName === '서재' || channelName === 'books';
}

function isSnowflakeThisMonth(snowflakeId: string): boolean {
  const discordEpoch = 1420070400000;
  const ts = Number(BigInt(snowflakeId) >> BigInt(22)) + discordEpoch;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return ts >= first.getTime();
}

/** 서재 유효 활동 → 백엔드 실시간 반영 */
async function handleLibraryActivityMessage(message: Message): Promise<void> {
  if (!isMessageInLibraryChannel(message)) return;
  if (message.author.bot) return;

  if (message.channel.isThread() && message.id === message.channel.id) {
    return;
  }

  if (!isValidLibraryMessage(message.content)) return;

  await pushLibraryActivityToBackend({
    discordUserId: message.author.id,
    sourceId: `msg:${message.id}`,
    kind: 'message',
    occurredAt: new Date(message.createdTimestamp).toISOString(),
  });
}

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;

  // DM → ADMIN_ID1에게 포워딩
  if (message.channel.type === ChannelType.DM) {
    if (!ADMIN_ID1) {
      console.warn('[dm-forward] ADMIN_ID1 미설정 — 포워딩 스킵');
      return;
    }

    try {
      const adminUser = await client.users.fetch(ADMIN_ID1);
      const lines: string[] = [];
      lines.push('📩 **새 DM 수신**');
      lines.push(`- from: **${message.author.username}** (\`${message.author.id}\`)`);
      lines.push(`- at: ${new Date(message.createdTimestamp).toLocaleString('ko-KR')}`);
      if (message.content?.trim()) {
        lines.push('');
        lines.push(message.content);
      } else {
        lines.push('');
        lines.push('(텍스트 없음)');
      }

      if (message.attachments.size > 0) {
        lines.push('');
        lines.push('첨부파일:');
        for (const att of message.attachments.values()) {
          lines.push(`- ${att.url}`);
        }
      }

      await adminUser.send(lines.join('\n'));
    } catch (error) {
      console.error('[dm-forward] ADMIN_ID1 포워딩 실패:', error);
    }
    return;
  }

  if (isMessageInLibraryChannel(message)) {
    await handleBookMessage(message);
    await handleLibraryActivityMessage(message);
  }

  if (message.channel.id === process.env.DIGGING_CHANNEL_ID) {
    await handleDiggingMessage(message);
  }
});

client.on(Events.ThreadCreate, async (thread) => {
  const libraryParentId = getLibraryParentChannelId();
  if (!libraryParentId || thread.parentId !== libraryParentId) return;
  if (!thread.ownerId) return;
  if (!isSnowflakeThisMonth(thread.id)) return;

  const owner = await thread.fetchOwner().catch(() => null);
  if (owner?.user?.bot) return;

  await pushLibraryActivityToBackend({
    discordUserId: thread.ownerId,
    sourceId: `thread:${thread.id}`,
    kind: 'thread',
    occurredAt: new Date(thread.createdTimestamp ?? Date.now()).toISOString(),
  });
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  await trackVoiceActivity(oldState, newState);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN이 설정되지 않았습니다.');
  process.exit(1);
}

client.login(token);
