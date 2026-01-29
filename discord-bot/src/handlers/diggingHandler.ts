import { Message } from 'discord.js';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

// 해시태그 추출
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([^\s#]+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

// URL에서 메타 타이틀 추출
async function fetchMetaTitle(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BoogibooksBot/1.0)',
        Accept: 'text/html',
      },
      maxRedirects: 3,
    });

    const html = response.data as string;

    // og:title 먼저 확인
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogTitleMatch) return ogTitleMatch[1].trim();

    // twitter:title 확인
    const twitterTitleMatch = html.match(
      /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i
    );
    if (twitterTitleMatch) return twitterTitleMatch[1].trim();

    // <title> 태그 확인
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) return titleMatch[1].trim();

    return null;
  } catch (error) {
    console.log(`  ⚠️ 메타 타이틀 추출 실패: ${url}`);
    return null;
  }
}

export async function handleDiggingMessage(message: Message) {
  const content = message.content;

  // URL 추출
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex);

  if (!urls || urls.length === 0) return;

  // 해시태그 추출
  const hashtags = extractHashtags(content);

  // URL과 해시태그를 제외한 텍스트를 설명(description)으로 사용
  const description =
    content
      .replace(urlRegex, '')
      .replace(/#[^\s#]+/g, '')
      .trim() || '';

  for (const url of urls) {
    try {
      // URL에서 메타 타이틀 추출
      const title = await fetchMetaTitle(url);

      // 백엔드 API로 디깅 추가
      await axios.post(`${BACKEND_URL}/digging/bot`, {
        url,
        title: title || undefined,
        description: description || '디스코드에서 공유된 링크',
        hashtags,
        discordId: message.author.id,
      });

      console.log(
        `🔗 디깅 추가: ${title ? `"${title}"` : url} by ${message.author.username}`
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
