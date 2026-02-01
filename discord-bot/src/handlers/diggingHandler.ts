import { Message } from 'discord.js';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

export async function handleDiggingMessage(message: Message) {
  // 봇 메시지 제외
  if (message.author.bot) return;

  const isForwarded =
    message.messageSnapshots && message.messageSnapshots.size > 0;
  const hasAttachments = message.attachments && message.attachments.size > 0;
  const hasEmbeds = message.embeds && message.embeds.length > 0;

  // 전달된 메시지 정보
  const forwardedSnapshot = message.messageSnapshots?.first();
  const forwardedEmbeds = forwardedSnapshot?.embeds;
  const hasForwardedEmbeds = forwardedEmbeds && forwardedEmbeds.length > 0;

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

  if (urls.length === 0) return;

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

  // ===== DB 저장 =====
  for (const url of urls) {
    try {
      await axios.post(`${BACKEND_URL}/digging/bot`, {
        url: url.trim(),
        title,
        description,
        thumbnail,
        discordId: message.author.id,
      });

      console.log(
        `🔗 디깅 추가: ${
          title ? `"${title.substring(0, 30)}"` : url.substring(0, 50)
        } by ${message.author.username}`,
      );
      await message.react('💡');
    } catch (error: unknown) {
      // 중복 등의 이유로 실패할 수 있음
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status !== 409) {
        console.error('디깅 추가 실패:', error);
      }
    }
  }
}
