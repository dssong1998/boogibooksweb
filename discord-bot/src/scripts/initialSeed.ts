/**
 * 🌱 부기북스 초기 시드 마이그레이션 스크립트
 * 
 * 디스코드 서버의 모든 데이터를 스캔하여 백엔드 DB에 저장합니다.
 * ⚠️ 최초 1회만 실행! (중복 실행 시 데이터 중복 발생 가능)
 * 
 * 실행: npx ts-node src/scripts/initialSeed.ts
 */

import {
  Client,
  GatewayIntentBits,
  ChannelType,
  TextChannel,
  ForumChannel,
  ThreadChannel,
  Collection,
  Message,
  GuildMember,
  Guild,
} from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// 채널 ID들 (환경변수 또는 직접 지정)
const LIBRARY_CHANNEL_ID = process.env.BOOKS_CHANNEL_ID || '';
const DIGGING_CHANNEL_ID = process.env.DIGGING_CHANNEL_ID || '';
const TABLE_LOG_CHANNEL_ID = process.env.TABLE_LOG_CHANNEL_ID || '';

// 역할 ID들
const TERRAS_ROLE_ID = process.env.DISCORD_TERRAS_ROLE_ID || '';
const MEMBER_ROLE_ID = process.env.DISCORD_MEMBER_ROLE_ID || '';

interface NaverBookItem {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  image: string;
  description: string;
}

interface NaverBookResponse {
  items: NaverBookItem[];
}

// 통계
const stats = {
  users: { total: 0, created: 0, skipped: 0 },
  books: { total: 0, created: 0, failed: 0 },
  comments: { total: 0, created: 0, failed: 0 },
  diggings: { total: 0, created: 0, failed: 0 },
  tableLogs: { total: 0, created: 0, failed: 0 },
};

// Discord 클라이언트 초기화
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * 1. 모든 유저 스캔 및 생성
 */
async function seedUsers(members: Collection<string, GuildMember>) {
  console.log('\n📥 [1/5] 유저 시드 시작...');
  
  for (const [, member] of members) {
    if (member.user.bot) continue;
    stats.users.total++;

    const roleIds = member.roles.cache.map(r => r.id);
    
    // 테라스 멤버 여부 (테라스 역할이 있으면 true)
    const isTerras = roleIds.includes(TERRAS_ROLE_ID);
    
    // 역할 결정 (테라스 멤버도 MEMBER로 설정, isTerras로 구분)
    let role = 'VISITOR';
    if (roleIds.includes(MEMBER_ROLE_ID) || isTerras) {
      role = 'MEMBER';
    }
    const username = member.nickname || member.user.globalName || member.user.username;

    try {
      await axios.post(`${BACKEND_URL}/users/seed`, {
        discordId: member.user.id,
        username,
        role,
        isTerras,
        coins: isTerras ? 5 : 0,
      });
      stats.users.created++;
      console.log(`  ✅ ${username}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        stats.users.skipped++;
        console.log(`  ⏭️ ${username} (이미 존재)`);
      } else {
        console.error(`  ❌ ${username} 실패:`, error.message);
        console.error(`     Status: ${error.response?.status}`);
        console.error(`     Data:`, error.response?.data);
      }
    }
  }
  
  console.log(`  📊 유저: ${stats.users.created}명 생성, ${stats.users.skipped}명 스킵`);
}

/**
 * 2. 서재 포스트에서 책 생성
 * 포스트 제목 형식: "<책 제목>, 작가" 또는 "책 제목 - 작가"
 */
async function seedBooksFromLibrary(channel: ForumChannel | TextChannel) {
  console.log('\n📚 [2/5] 서재에서 책 시드 시작...');

  // 포럼 채널인 경우
  if (channel.type === ChannelType.GuildForum) {
    const threads = await channel.threads.fetchActive();
    const archivedThreads = await channel.threads.fetchArchived({ limit: 100 });
    
    const allThreads = [...threads.threads.values(), ...archivedThreads.threads.values()];
    console.log(`  📂 ${allThreads.length}개의 포스트 발견`);

    for (const thread of allThreads) {
      stats.books.total++;
      await processBookThread(thread);
    }
  }
  
  console.log(`  📊 책: ${stats.books.created}권 생성, ${stats.books.failed}권 실패`);
}

/**
 * 포스트(스레드)에서 책 정보 추출 및 생성
 */
async function processBookThread(thread: ThreadChannel) {
  const title = thread.name;
  
  // 제목에서 책 제목과 작가 파싱
  // 형식: "책 제목, 작가" 또는 "책 제목 - 작가"
  let bookTitle = '';
  let author = '';
  
  if (title.includes(',')) {
    const parts = title.split(',');
    bookTitle = parts[0].trim();
    author = parts.slice(1).join(',').trim();
  } else if (title.includes(' - ')) {
    const parts = title.split(' - ');
    bookTitle = parts[0].trim();
    author = parts.slice(1).join(' - ').trim();
  } else {
    bookTitle = title.trim();
  }

  // 스레드 생성자 찾기 (첫 메시지 작성자)
  const starterMessage = await thread.fetchStarterMessage().catch(() => null);
  const discordUserId = starterMessage?.author.id || thread.ownerId || '';

  if (!discordUserId) {
    console.log(`  ⏭️ "${bookTitle}" - 작성자 찾을 수 없음`);
    stats.books.failed++;
    return;
  }

  // 네이버 책 검색으로 상세 정보 가져오기
  let bookData: any = {
    title: bookTitle,
    author: author || '작가 미상',
  };

  try {
    const searchQuery = author ? `${bookTitle} ${author}` : bookTitle;
    const searchResponse = await axios.get<NaverBookResponse>(
      `${BACKEND_URL}/books/search?query=${encodeURIComponent(searchQuery)}`
    );
    
    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const naverBook = searchResponse.data.items[0];
      bookData = {
        title: naverBook.title.replace(/<\/?b>/g, ''),
        author: naverBook.author,
        isbn: naverBook.isbn,
        publisher: naverBook.publisher,
        coverUrl: naverBook.image,
        description: naverBook.description?.replace(/<\/?b>/g, ''),
      };
    }
  } catch (error) {
    console.log(`  ⚠️ "${bookTitle}" 네이버 검색 실패, 기본 정보 사용`);
  }

  // 책 생성
  try {
    const response = await axios.post(`${BACKEND_URL}/books/seed`, {
      ...bookData,
      discordUserId,
      threadId: thread.id,
    });
    
    stats.books.created++;
    console.log(`  ✅ "${bookData.title}" by ${discordUserId}`);

    // 해당 스레드의 코멘트들도 시드
    await seedCommentsFromThread(thread, response.data.id, discordUserId);
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`  ⏭️ "${bookData.title}" (이미 존재)`);
    } else {
      console.error(`  ❌ "${bookData.title}" 실패:`, error.message);
      stats.books.failed++;
    }
  }
}

/**
 * 3. 스레드 내 메시지들을 코멘트로 변환
 */
async function seedCommentsFromThread(
  thread: ThreadChannel,
  bookId: string,
  bookOwnerDiscordId: string
) {
  try {
    const messages = await fetchAllMessages(thread);
    
    for (const message of messages) {
      if (message.author.bot) continue;
      if (!message.content || message.content.length < 5) continue;
      
      stats.comments.total++;

      try {
        await axios.post(`${BACKEND_URL}/comments/seed`, {
          bookId,
          discordUserId: message.author.id,
          content: message.content,
          type: 'REVIEW', // 기본값
          createdAt: message.createdAt.toISOString(),
        });
        stats.comments.created++;
      } catch (error: any) {
        if (error.response?.status !== 409) {
          stats.comments.failed++;
        }
      }
    }
  } catch (error) {
    console.log(`    ⚠️ 코멘트 시드 실패`);
  }
}

/**
 * 4. 디깅박스 채널에서 디깅 생성
 * 
 * 텍스트 채널의 메시지에서:
 * - URL 추출 → 디깅 URL
 * - 메시지 작성자 → 디깅 추가자
 * - URL 제외한 나머지 텍스트 → 코멘트(description)
 */
async function seedDiggings(channel: TextChannel) {
  console.log('\n🔗 [4/5] 디깅박스 시드 시작...');

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const messages = await fetchAllMessages(channel);
  
  console.log(`  📝 ${messages.length}개의 메시지 발견`);

  for (const message of messages) {
    // 봇 메시지 제외
    if (message.author.bot) continue;
    
    // URL 추출
    const urls = message.content.match(urlRegex);
    if (!urls || urls.length === 0) continue;

    // URL을 제외한 나머지가 코멘트
    const comment = message.content.replace(urlRegex, '').trim();
    const username = message.member?.nickname || message.author.username;

    // 각 URL에 대해 디깅 생성
    for (const url of urls) {
      stats.diggings.total++;
      
      try {
        await axios.post(`${BACKEND_URL}/digging/seed`, {
          discordUserId: message.author.id,
          url: url.trim(),
          description: comment || '디스코드에서 공유됨',
          createdAt: message.createdAt.toISOString(),
        });
        stats.diggings.created++;
        console.log(`  ✅ ${username}: ${url.substring(0, 50)}...`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log(`  ⏭️ ${username}: 이미 존재`);
        } else {
          stats.diggings.failed++;
          console.log(`  ❌ ${username}: 실패`);
        }
      }
    }
  }

  console.log(`  📊 디깅: ${stats.diggings.created}개 생성, ${stats.diggings.failed}개 실패`);
}

/**
 * 5. 식탁 방명록에서 참여 기록 시드
 * 
 * 임베드 메시지 형식:
 * ```
 * dal._.gam_02444
 * @감자깡 joined voice channel ⁠🥄ㅣ식탁
 * ID: 1292027275717509140•오늘 오후 10:46
 * ```
 */
async function seedTableLogs(channel: TextChannel, guild: Guild) {
  console.log('\n🍽️ [5/5] 식탁 방명록 시드 시작...');

  const messages = await fetchAllMessages(channel);
  console.log(`  📝 ${messages.length}개의 메시지 발견`);

  for (const message of messages) {
    // 봇이 보낸 임베드 메시지만 처리
    if (!message.author.bot || message.embeds.length === 0) continue;

    for (const embed of message.embeds) {
      const embedData = embed.data || {};
      const discordUserId = (embedData as any).footer?.text?.split(' ')[1];
      if (!discordUserId) continue;
      const user = await guild.members.fetch(discordUserId).catch(() => null);
      if (!user) continue;
      const nickname = user.nickname || user.user.globalName || user.user.username;

      // 액션 타입 결정 (joined = 입장, left = 퇴장)

      const logType = 'VOICE_JOIN';
      
      stats.tableLogs.total++;

      try {
        await axios.post(`${BACKEND_URL}/table-logs/seed`, {
          discordUserId,
          type: logType,
          timestamp: message.createdAt.toISOString(),
          messageContent: `${nickname} ${ '입장' }`,
          messageId: message.id,
        });
        stats.tableLogs.created++; 
        console.log(`  ✅ ${nickname} (${discordUserId}) - ${'입장'} @ ${message.createdAt.toLocaleString('ko-KR')}`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          // 이미 존재하는 경우 스킵
        } else {
          stats.tableLogs.failed++;
          console.log(`  ❌ ${discordUserId} 실패:`, error.message);
        }
      }
    }
  }

  console.log(`  📊 식탁방명록: ${stats.tableLogs.created}개 생성, ${stats.tableLogs.failed}개 실패`);
}

/**
 * 채널의 모든 메시지 가져오기 (페이징 처리)
 */
async function fetchAllMessages(
  channel: TextChannel | ThreadChannel
): Promise<Message[]> {
  const allMessages: Message[] = [];
  let lastId: string | undefined;

  while (true) {
    const options: { limit: number; before?: string } = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    allMessages.push(...messages.values());
    lastId = messages.last()?.id;

    // Rate limit 방지
    await sleep(500);
  }

  return allMessages;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🌱 ========================================');
  console.log('   부기북스 초기 시드 마이그레이션');
  console.log('========================================\n');

  if (!BOT_TOKEN || !GUILD_ID) {
    console.error('❌ DISCORD_BOT_TOKEN과 DISCORD_GUILD_ID가 필요합니다.');
    process.exit(1);
  }

  // 확인 프롬프트
  console.log('⚠️  주의: 이 스크립트는 최초 1회만 실행해야 합니다!');
  console.log('   중복 실행 시 데이터가 중복될 수 있습니다.\n');
  console.log('   계속하려면 10초 후 자동으로 시작됩니다...\n');
  await sleep(10000);

  await client.login(BOT_TOKEN);
  console.log('✅ Discord 봇 로그인 성공\n');

  const guild = await client.guilds.fetch(GUILD_ID);
  console.log(`✅ 서버 로드: ${guild.name}\n`);

  // 1. 유저 시드
  const members = await guild.members.fetch();
  await seedUsers(members);

  // 2. 서재에서 책 시드
  if (LIBRARY_CHANNEL_ID) {
    const libraryChannel = await guild.channels.fetch(LIBRARY_CHANNEL_ID);
    if (libraryChannel && (libraryChannel.type === ChannelType.GuildForum || libraryChannel.type === ChannelType.GuildText)) {
      await seedBooksFromLibrary(libraryChannel as ForumChannel | TextChannel);
    }
  } else {
    console.log('\n📚 [2/5] 서재 채널 ID 미설정 - 스킵');
  }

  // 3. 코멘트는 책 시드 시 자동 처리됨
  console.log(`\n💬 [3/5] 코멘트: ${stats.comments.created}개 생성됨`);

  // 4. 디깅박스 시드 (텍스트 채널의 메시지에서 URL 추출)
  if (DIGGING_CHANNEL_ID) {
    const diggingChannel = await guild.channels.fetch(DIGGING_CHANNEL_ID);
    if (diggingChannel && diggingChannel.type === ChannelType.GuildText) {
      await seedDiggings(diggingChannel as TextChannel);
    } else {
      console.log('\n🔗 [4/5] 디깅박스 채널이 텍스트 채널이 아닙니다 - 스킵');
    }
  } else {
    console.log('\n🔗 [4/5] 디깅박스 채널 ID 미설정 - 스킵');
  }

  // 5. 식탁 방명록 시드
  if (TABLE_LOG_CHANNEL_ID) {
    const tableLogChannel = await guild.channels.fetch(TABLE_LOG_CHANNEL_ID);
    if (tableLogChannel && tableLogChannel.type === ChannelType.GuildText) {
      await seedTableLogs(tableLogChannel as TextChannel, guild as Guild);
    }
  } else {
    console.log('\n🍽️ [5/5] 식탁방명록 채널 ID 미설정 - 스킵');
  }

  // 최종 통계
  console.log('\n========================================');
  console.log('📊 최종 시드 결과');
  console.log('========================================');
  console.log(`👥 유저: ${stats.users.created}명 생성, ${stats.users.skipped}명 스킵`);
  console.log(`📚 책: ${stats.books.created}권 생성, ${stats.books.failed}권 실패`);
  console.log(`💬 코멘트: ${stats.comments.created}개 생성, ${stats.comments.failed}개 실패`);
  console.log(`🔗 디깅: ${stats.diggings.created}개 생성, ${stats.diggings.failed}개 실패`);
  console.log(`🍽️ 식탁: ${stats.tableLogs.created}개 생성, ${stats.tableLogs.failed}개 실패`);
  console.log('========================================\n');

  console.log('✨ 시드 마이그레이션 완료!');
  
  await client.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 시드 마이그레이션 실패:', error);
  process.exit(1);
});
