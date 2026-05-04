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
import { processBoogiOutOutboxOnce } from './lib/processBoogiOutOutbox';
import { processDiscordDmOutboxOnce } from './lib/processDiscordDmOutbox';
import axios from 'axios';

dotenv.config();

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ADMIN_ID1 = process.env.ADMIN_ID1;
const ROLE_REGULAR = (process.env.ROLE_REGULAR || '').trim();
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWhenThreadReady(
  thread: Parameters<Parameters<typeof client.on>[1]>[0],
  content: string,
): Promise<void> {
  // forum thread는 생성 직후 "starter message"가 아직 없는 짧은 구간이 있어
  // 이때 thread.send()를 호출하면 40058이 발생할 수 있음.
  const maxAttempts = 10;
  const delayMs = 1500;

  // join이 필요한 경우(권한/설정)에 대비. 실패해도 계속 시도.
  await thread.join().catch(() => {});

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const starter = await thread.fetchStarterMessage().catch(() => null);
    if (!starter) {
      await sleep(delayMs);
      continue;
    }

    try {
      await thread.send(content);
      return;
    } catch (e: any) {
      if (e?.code === 40058) {
        await sleep(delayMs);
        continue;
      }
      throw e;
    }
  }

  throw new Error(
    `[library-thread] thread not ready after ${maxAttempts} attempts`,
  );
}

type PendingLibraryThreadNotification = {
  timeout: NodeJS.Timeout;
  lastMessageId: string;
  lastMessageUrl: string;
  lastAuthorId: string;
};

const pendingLibraryThreadNotifications = new Map<
  string,
  PendingLibraryThreadNotification
>();

function scheduleLibraryChatNotification(message: Message): void {
  // 서재 포럼 스레드 "새 댓글" 알림 (디바운스):
  // - 같은 스레드에서 1분 내 연속 메시지는 알림 1개로 축소
  // - 마지막 메시지 기준 1분 뒤에도 메시지가 남아있으면 알림 전송
  // - 알림 메시지는 5초 뒤 삭제
  if (message.author.bot) return;
  if (!ROLE_REGULAR) return;
  if (!isMessageInLibraryChannel(message)) return;
  if (!message.channel.isThread()) return;

  const threadId = message.channel.id;
  const existing = pendingLibraryThreadNotifications.get(threadId);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  const timeout = setTimeout(async () => {
    const pending = pendingLibraryThreadNotifications.get(threadId);
    pendingLibraryThreadNotifications.delete(threadId);
    if (!pending) return;

    // 마지막 메시지가 1분 뒤에도 지워지지 않았는지 확인
    const thread = message.channel;
    const last = await thread.messages.fetch(pending.lastMessageId).catch(() => null);
    if (!last) return;

    try {
      const content =
        `<@&${ROLE_REGULAR}> 서재에 새로운 글이 올라왔습니다.\n` +
        `- 작성자: <@${pending.lastAuthorId}>\n` +
        `- 링크: ${pending.lastMessageUrl}`;

      await sendWhenThreadReady(thread, content);

      setTimeout(async () => {
        try {
          const msgs = await thread.messages.fetch({ limit: 10 });
          const target = msgs.find(
            (m) => m.author.id === client.user?.id && m.content === content,
          );
          await target?.delete().catch(() => {});
        } catch {}
      }, 5000);
    } catch (e) {
      console.error('[library-thread] 새 댓글 알림 전송 실패:', e);
    }
  }, 60_000);

  pendingLibraryThreadNotifications.set(threadId, {
    timeout,
    lastMessageId: message.id,
    lastMessageUrl: message.url,
    lastAuthorId: message.author.id,
  });
}

type NaverBookItem = {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  image: string;
  description?: string;
};

type NaverBookResponse = {
  items?: NaverBookItem[];
};

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

  console.log('processBoogiOutOutboxOnce / processDiscordDmOutboxOnce');
  await processBoogiOutOutboxOnce(c);
  await processDiscordDmOutboxOnce(c);
  setInterval(async () => {
    await processBoogiOutOutboxOnce(c);
    await processDiscordDmOutboxOnce(c);
  }, 45_000);
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

function stripNaverHighlight(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/<\/?b>/g, '').trim();
}

async function buildBookDataFromNaver(input: {
  title: string;
  author: string;
}): Promise<{
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
}> {
  const base = {
    title: input.title,
    author: input.author || '작가 미상',
  };

  try {
    const searchQuery = input.author
      ? `${input.title} ${input.author}`
      : input.title;
    const res = await axios.get<NaverBookResponse>(
      `${BACKEND_URL}/books/search?query=${encodeURIComponent(searchQuery)}`,
      { timeout: 20000 },
    );
    const item = res.data?.items?.[0];
    if (!item) return base;

    return {
      title: stripNaverHighlight(item.title) || base.title,
      author: item.author || base.author,
      isbn: item.isbn,
      publisher: item.publisher,
      coverUrl: item.image,
      description: stripNaverHighlight(item.description),
    };
  } catch {
    return base;
  }
}

async function seedBookFromThread(threadId: string) {
  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (!thread || !thread.isThread()) return null;

  const starter = await thread.fetchStarterMessage().catch(() => null);
  const discordUserId = starter?.author?.id || thread.ownerId || '';
  if (!discordUserId) return null;

  const parsed = parseThreadTitle(thread.name);
  const bookData = await buildBookDataFromNaver(parsed);
  const description = starter?.content?.trim() || bookData.description || '';

  const res = await axios.post(
    `${BACKEND_URL}/books/seed`,
    {
      ...bookData,
      description,
      discordUserId,
      threadId: thread.id,
    },
    { timeout: 20000 },
  );
  return res.data as { id: string };
}

async function seedCommentFromMessage(bookId: string, message: Message) {
  if (message.author.bot) return;
  const content = (message.content || '').trim();
  if (!content) return;

  await axios.post(
    `${BACKEND_URL}/comments/seed`,
    {
      bookId,
      discordUserId: message.author.id,
      content,
      type: 'REVIEW',
      createdAt: new Date(message.createdTimestamp).toISOString(),
      messageId: message.id,
    },
    { timeout: 20000 },
  );
}

/** 서재 메시지 전부 → 백엔드 반영 (유효 여부는 별도 플래그로 집계) */
async function handleLibraryActivityMessage(message: Message): Promise<void> {
  if (!isMessageInLibraryChannel(message)) return;
  if (message.author.bot) return;

  const valid = isValidLibraryMessage(message.content);
  if (!valid) return;

  await pushLibraryActivityToBackend({
    discordUserId: message.author.id,
    sourceId: `msg:${message.id}`,
    kind: 'message',
    occurredAt: new Date(message.createdTimestamp).toISOString(),
    isValidForEvent: true,
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
      lines.push(
        `- from: **${message.author.username}** (\`${message.author.id}\`)`,
      );
      lines.push(
        `- at: ${new Date(message.createdTimestamp).toLocaleString('ko-KR')}`,
      );
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
    scheduleLibraryChatNotification(message);
    await handleBookMessage(message);
    await handleLibraryActivityMessage(message);

    // 포럼 스레드 메시지라면: Book/Comment 반영
    if (message.channel.isThread()) {
      const threadId = message.channel.id;
      try {
        const book = await seedBookFromThread(threadId);
        if (book?.id) {
          await seedCommentFromMessage(book.id, message);
        }
      } catch (e) {
        // 실패해도 메시지 처리 흐름은 계속
      }
    }
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

  // 새 포스트 생성 시 ROLE_REGULAR 멘션 알림 (삭제하지 않음)
  if (ROLE_REGULAR) {
    try {
      await sendWhenThreadReady(
        thread,
        `<@&${ROLE_REGULAR}> 여러분께 전송되는 새 책 추가 알림입니다.`,
      );
    } catch (e) {
      console.error('[library-thread] ROLE_REGULAR 멘션 메시지 전송 실패:', e);
    }
  } else {
    console.warn('[library-thread] ROLE_REGULAR 미설정 — 멘션 알림 스킵');
  }

  await pushLibraryActivityToBackend({
    discordUserId: thread.ownerId,
    sourceId: `thread:${thread.id}`,
    kind: 'thread',
    occurredAt: new Date(thread.createdTimestamp ?? Date.now()).toISOString(),
    isValidForEvent: true,
  });

  // 스레드 생성 시점에 Book 생성(네이버 검색 포함, 실패해도 무시)
  try {
    await seedBookFromThread(thread.id);
  } catch {}
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
