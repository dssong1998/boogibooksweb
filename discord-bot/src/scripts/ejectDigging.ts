import {
  Client,
  GatewayIntentBits,
  ChannelType,
  Message,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const DIGGING_CHANNEL_ID = process.env.DIGGING_CHANNEL_ID || '';

// 통계
const stats = {
  total: 0,
  created: 0,
  skipped: 0,
  failed: 0,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function fetchAllMessages(
  channel: TextChannel | ThreadChannel,
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ejectDigging(channel: TextChannel) {
  const messages = await fetchAllMessages(channel);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📥 총 ${messages.length}개의 메시지를 가져왔습니다.`);
  console.log(`${'='.repeat(60)}\n`);

  for (const [index, message] of messages.entries()) {
    // 봇 메시지 제외
    if (message.author.bot) continue;

    const isForwarded =
      message.messageSnapshots && message.messageSnapshots.size > 0;
    const hasAttachments = message.attachments && message.attachments.size > 0;
    const hasEmbeds = message.embeds && message.embeds.length > 0;

    // 전달된 메시지 정보
    const forwardedSnapshot = message.messageSnapshots?.first();
    const forwardedEmbeds = forwardedSnapshot?.embeds;
    const hasForwardedEmbeds = forwardedEmbeds && forwardedEmbeds.length > 0;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📝 메시지 #${index + 1} (ID: ${message.id})`);
    console.log(`👤 작성자: ${message.author.username}`);
    console.log(`📅 작성일: ${message.createdAt.toLocaleString('ko-KR')}`);
    console.log(`${'─'.repeat(50)}`);

    // 메시지 타입 표시
    console.log(`\n🏷️  [메시지 타입 분석]`);
    console.log(`   ├─ 전달된 메시지: ${isForwarded ? '✅ 예' : '❌ 아니오'}`);
    console.log(
      `   ├─ 첨부파일: ${
        hasAttachments ? `✅ ${message.attachments.size}개` : '❌ 없음'
      }`,
    );
    console.log(
      `   └─ 임베드(Embed): ${
        hasEmbeds ? `✅ ${message.embeds.length}개` : '❌ 없음'
      }`,
    );

    // ===== URL 추출 =====
    let urls: string[] = [];

    // 1. 메시지 본문에서 URL 추출
    const contentUrls = message.content?.match(/https?:\/\/[^\s]+/g) || [];
    for (const url of contentUrls) {
      if (url.includes('youtu.be')) {
        const videoId = url?.split('/')?.pop()?.split('?')[0];
        urls.push(`https://www.youtube.com/watch?v=${videoId}`);
      } else if (url.includes('youtube.com/shorts/')) {
        const videoId = url?.split('/')?.pop()?.split('?')[0];
        urls.push(`https://www.youtube.com/watch?v=${videoId}`);
      } else if (url.includes('youtube.com/watch?v=')) {
        const videoId = url?.split('?v=')?.pop()?.split('&')[0];
        urls.push(`https://www.youtube.com/watch?v=${videoId}`);
      } else {
        urls.push(url);
      }
    }

    // 2. 전달된 메시지에서 URL 추출
    if (isForwarded && forwardedSnapshot?.content) {
      const forwardedUrls =
        forwardedSnapshot.content.match(/https?:\/\/[^\s]+/g) || [];
      urls.push(...forwardedUrls);
    }

    // 3. 임베드에서 URL 추출
    if (hasEmbeds) {
      for (const embed of message.embeds) {
        if (embed.url) urls.push(embed.url);
      }
    }

    // 4. 전달된 메시지의 임베드에서 URL 추출
    if (hasForwardedEmbeds) {
      for (const embed of forwardedEmbeds) {
        if (embed.url) urls.push(embed.url);
      }
    }

    // URL 중복 제거
    urls = [...new Set(urls)];

    if (urls.length === 0) {
      console.log(`   ⏭️ URL 없음 - 스킵`);
      stats.skipped++;
      continue;
    }

    // ===== 데이터 추출 =====
    const discordText =
      message.content
        ?.replace(/https?:\/\/[^\s"'<>]+/g, '')
        .replace(/#[^\s#]+/g, '')
        .trim() || '';

    // Title 우선순위: 1.전달된 메시지 임베드 제목 2.임베드 제목 3.텍스트 첫 15자 4.없음
    let title: string | undefined;
    if (hasForwardedEmbeds && forwardedEmbeds[0]?.title) {
      title = forwardedEmbeds[0].title;
    } else if (hasEmbeds && message.embeds[0]?.title) {
      title = message.embeds[0].title;
    } else if (discordText && discordText.length > 0) {
      title = discordText.substring(0, 15);
    }

    // Description 우선순위: 1.텍스트+임베드설명 2.기본값
    let description: string = '';
    const embedDescription = hasForwardedEmbeds
      ? forwardedEmbeds[0]?.description
      : hasEmbeds
      ? message.embeds[0]?.description
      : undefined;

    if (discordText || embedDescription) {
      const parts: string[] = [];
      if (discordText) parts.push(discordText);
      if (embedDescription) parts.push(embedDescription);
      description = parts.join('\n\n---\n\n');
    }

    // Thumbnail 우선순위: 1.이미지 첨부파일 2.임베드 썸네일 3.없음
    let thumbnail: string | undefined;
    const imageAttachment = message.attachments.find((att) =>
      att.contentType?.startsWith('image/'),
    );
    if (imageAttachment) {
      thumbnail = imageAttachment.url;
    } else if (hasForwardedEmbeds && forwardedEmbeds[0]?.thumbnail?.url) {
      thumbnail = forwardedEmbeds[0].thumbnail.url;
    } else if (hasEmbeds && message.embeds[0]?.thumbnail?.url) {
      thumbnail = message.embeds[0].thumbnail.url;
    }

    // 로그 출력
    console.log(`\n📊 [저장할 데이터]`);
    console.log(`   ├─ Title: ${title || '(없음)'}`);
    console.log(
      `   ├─ Description: ${
        description ? description.substring(0, 50) + '...' : '(없음)'
      }`,
    );
    console.log(`   ├─ Thumbnail: ${thumbnail ? '✅ 있음' : '❌ 없음'}`);
    console.log(`   └─ URLs: ${urls.length}개`);

    // ===== DB 저장 =====
    for (const url of urls) {
      stats.total++;
      try {
        await axios.post(`${BACKEND_URL}/digging/seed`, {
          discordUserId: message.author.id,
          url: url.trim(),
          title,
          description,
          thumbnail,
          createdAt: message.createdAt.toISOString(),
        });
        stats.created++;
        console.log(`   ✅ 저장 완료: ${url.substring(0, 50)}...`);
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status?: number; data?: unknown };
        };
        if (axiosError.response?.status === 409) {
          console.log(`   ⏭️ 이미 존재: ${url.substring(0, 50)}...`);
          stats.skipped++;
        } else {
          stats.failed++;
          console.log(`   ❌ 저장 실패: ${url.substring(0, 50)}...`);
          console.log(
            `      에러: ${JSON.stringify(axiosError.response?.data || error)}`,
          );
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ 디깅 추출 완료`);
  console.log(`📊 통계: 총 ${stats.total}개 처리`);
  console.log(`   ├─ 생성: ${stats.created}개`);
  console.log(`   ├─ 스킵(중복): ${stats.skipped}개`);
  console.log(`   └─ 실패: ${stats.failed}개`);
  console.log(`${'='.repeat(60)}\n`);
}

async function main() {
  await client.login(BOT_TOKEN);

  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(DIGGING_CHANNEL_ID);

  if (channel && channel.type === ChannelType.GuildText) {
    await ejectDigging(channel as TextChannel);
  } else {
    console.error('채널을 찾을 수 없습니다.');
  }

  await client.destroy();
}

main();
