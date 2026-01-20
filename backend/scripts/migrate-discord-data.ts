/**
 * Discord 서버 데이터 마이그레이션 스크립트
 * 
 * 사용법:
 * 1. .env에 Discord Bot Token 추가: DISCORD_BOT_TOKEN=your_bot_token
 * 2. npx ts-node scripts/migrate-discord-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { Client, GatewayIntentBits } from 'discord.js';

const prisma = new PrismaClient({});

interface DiscordMemberData {
  id: string;
  username: string;
  nickname: string | null;
  joinedAt: Date;
  roles: string[];
}

interface VoiceStats {
  userId: string;
  totalMinutes: number;
  uniqueDays: number;
}

async function main() {
  console.log('🚀 Discord 데이터 마이그레이션 시작...');

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    throw new Error('DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must be set in .env');
  }

  // Discord 클라이언트 초기화
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  await client.login(botToken);
  console.log('✅ Discord 봇 로그인 성공');

  const guild = await client.guilds.fetch(guildId);
  console.log(`✅ 서버 로드: ${guild.name}`);

  // 1. 멤버 데이터 마이그레이션
  console.log('\n📥 멤버 데이터 수집 중...');
  const members = await guild.members.fetch();
  console.log(`  - 총 ${members.size}명의 멤버 발견`);

  let migratedUsers = 0;
  for (const [, member] of members) {
    if (member.user.bot) continue; // 봇 제외

    const userData = {
      discordId: member.user.id,
      username: member.nickname || member.user.globalName || member.user.username,
      email: null,
      role: determineRole(member),
      coins: 0, // 기본 코인
    };

    try {
      await prisma.user.upsert({
        where: { discordId: userData.discordId },
        update: userData,
        create: userData,
      });
      migratedUsers++;
    } catch (error) {
      console.error(`  ❌ 실패: ${userData.username}`, error);
    }
  }
  console.log(`✅ ${migratedUsers}명의 멤버 마이그레이션 완료`);

  // 2. 음성 채널 통계 (실제로는 별도 로그가 필요, 여기서는 예시)
  console.log('\n📊 음성 채널 통계 계산 중...');
  // TODO: 실제 음성 채널 로그 데이터에서 통계 계산
  console.log('  ⚠️  음성 채널 통계는 별도의 로그 데이터가 필요합니다.');

  // 3. 메시지 데이터에서 도서/링크 추출 (예시)
  console.log('\n📚 메시지 데이터 분석 중...');
  const channels = await guild.channels.fetch();
  const bookChannel = channels.find(c => c?.name === '서재' || c?.name === 'books');
  
  if (bookChannel && bookChannel.isTextBased()) {
    console.log(`  - 채널 발견: ${bookChannel.name}`);
    // TODO: 메시지 히스토리에서 도서 정보 추출
    console.log('  ⚠️  메시지 파싱 로직 필요 (도서 제목, ISBN 등)');
  }

  console.log('\n✨ 마이그레이션 완료!');
  
  await client.destroy();
  await prisma.$disconnect();
}

function determineRole(member: any): 'MEMBER' | 'VISITOR' {
  // 역할 이름으로 판단 (실제 역할 ID로 변경 필요)
  const roleNames = member.roles.cache.map((r: any) => r.name.toLowerCase());
  
  // 테라스/멤버 역할이 있으면 MEMBER
  if (roleNames.includes('테라스') || roleNames.includes('terras') ||
      roleNames.includes('멤버') || roleNames.includes('member')) {
    return 'MEMBER';
  }
  return 'VISITOR';
}

function isTerrasMember(member: any): boolean {
  const roleNames = member.roles.cache.map((r: any) => r.name.toLowerCase());
  return roleNames.includes('테라스') || roleNames.includes('terras');
}

// 에러 핸들링
main()
  .catch((e) => {
    console.error('❌ 마이그레이션 실패:', e);
    process.exit(1);
  });
