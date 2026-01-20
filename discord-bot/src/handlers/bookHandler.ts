import { Message } from 'discord.js';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

export async function handleBookMessage(message: Message) {
  const content = message.content;

  // ISBN 패턴 감지
  const isbnRegex = /(?:ISBN[:\s]*)?(\d{10}|\d{13})/gi;
  const isbnMatch = content.match(isbnRegex);

  if (isbnMatch) {
    console.log(`📚 ISBN 감지: ${isbnMatch[0]} by ${message.author.username}`);
    
    try {
      // 네이버 도서 검색 API로 책 정보 조회
      const response = await axios.get(
        `${BACKEND_URL}/books/search?query=${isbnMatch[0]}`,
        {
          headers: {
            'user-id': message.author.id, // Discord User ID
          },
        }
      );

      if (response.data.items && response.data.items.length > 0) {
        const book = response.data.items[0];
        
        // 사용자 서재에 자동 추가
        await axios.post(
          `${BACKEND_URL}/books`,
          {
            title: book.title.replace(/<\/?b>/g, ''),
            author: book.author,
            isbn: book.isbn,
            publisher: book.publisher,
            coverUrl: book.image,
            description: book.description?.replace(/<\/?b>/g, ''),
          },
          {
            headers: {
              'user-id': message.author.id,
            },
          }
        );

        await message.react('✅');
        await message.reply(
          `📚 "${book.title.replace(/<\/?b>/g, '')}"를 서재에 추가했습니다!`
        );
      }
    } catch (error) {
      console.error('책 추가 실패:', error);
      await message.react('❌');
    }
  }

  // "읽었어요", "완독" 등의 키워드 감지
  const completionKeywords = ['읽었어요', '완독', '다 읽었', '완료'];
  if (completionKeywords.some(keyword => content.includes(keyword))) {
    console.log(`✅ 독서 완료 메시지: ${message.author.username}`);
    // TODO: 사용자의 totalBooksRead 증가
    await message.react('🎉');
  }
}
