import { Message } from 'discord.js';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

export async function handleDiggingMessage(message: Message) {
  const content = message.content;

  // URL 추출
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex);

  if (!urls || urls.length === 0) return;

  // URL 이외의 텍스트를 설명으로 사용
  const description = content.replace(urlRegex, '').trim() || '디스코드에서 공유된 링크';

  for (const url of urls) {
    try {
      // 백엔드 API로 디깅 추가
      await axios.post(
        `${BACKEND_URL}/digging`,
        {
          url,
          description,
        },
        {
          headers: {
            'user-id': message.author.id,
          },
        }
      );

      console.log(`🔗 디깅 추가: ${url} by ${message.author.username}`);
      await message.react('💡');
    } catch (error: any) {
      // 중복 등의 이유로 실패할 수 있음
      if (error.response?.status !== 409) {
        console.error('디깅 추가 실패:', error);
      }
    }
  }
}
