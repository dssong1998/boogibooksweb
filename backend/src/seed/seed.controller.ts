import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 시드 컨트롤러 - 초기 데이터 마이그레이션용
 * ⚠️ 프로덕션에서는 비활성화하거나 인증 필요
 */
@Controller()
export class SeedController {
  constructor(private readonly prisma: PrismaService) {}

  // 유저 시드
  @Post('users/seed')
  async seedUser(
    @Body()
    data: {
      discordId: string;
      username: string;
      role: string;
      isTerras?: boolean;
      coins?: number;
    },
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await (this.prisma as any).user.upsert({
        where: { discordId: data.discordId },
        update: {
          username: data.username,
          role: data.role,
          isTerras: data.isTerras || false,
        },
        create: {
          discordId: data.discordId,
          username: data.username,
          role: data.role,
          isTerras: data.isTerras || false,
          coins: data.coins || 0,
        },
      });
    } catch (error) {
      console.error('User seed error:', error);
      throw new HttpException(
        'User seed failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 책 시드
  @Post('books/seed')
  async seedBook(
    @Body()
    data: {
      discordUserId: string;
      title: string;
      author: string;
      isbn?: string;
      publisher?: string;
      coverUrl?: string;
      description?: string;
      threadId?: string;
    },
  ) {
    try {
      // 유저 찾기 (없으면 생성)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      let user = await (this.prisma as any).user.findUnique({
        where: { discordId: data.discordUserId },
      });

      if (!user) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        user = await (this.prisma as any).user.create({
          data: {
            discordId: data.discordUserId,
            username: `User_${data.discordUserId.slice(-4)}`,
            role: 'VISITOR',
          },
        });
      }

      // 중복 체크 (같은 유저의 같은 책)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existing = await (this.prisma as any).book.findFirst({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          userId: user.id,
          title: data.title,
        },
      });

      if (existing) {
        throw new HttpException('Book already exists', HttpStatus.CONFLICT);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await (this.prisma as any).book.create({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          userId: user.id,
          title: data.title,
          author: data.author,
          isbn: data.isbn,
          publisher: data.publisher,
          coverUrl: data.coverUrl,
          description: data.description,
        },
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.status === HttpStatus.CONFLICT) throw error;
      throw new HttpException(
        'Book seed failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 코멘트 시드
  @Post('comments/seed')
  async seedComment(
    @Body()
    data: {
      bookId: string;
      discordUserId: string;
      content: string;
      type?: string;
      createdAt?: string;
    },
  ) {
    try {
      // 유저 찾기
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      let user = await (this.prisma as any).user.findUnique({
        where: { discordId: data.discordUserId },
      });

      if (!user) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        user = await (this.prisma as any).user.create({
          data: {
            discordId: data.discordUserId,
            username: `User_${data.discordUserId.slice(-4)}`,
            role: 'VISITOR',
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await (this.prisma as any).comment.create({
        data: {
          bookId: data.bookId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          userId: user.id,
          content: data.content,
          type: data.type || 'REVIEW',
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        },
      });
    } catch (error) {
      console.error('Comment seed error:', error);
      throw new HttpException(
        'Comment seed failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 디깅 시드
  @Post('digging/seed')
  async seedDigging(
    @Body()
    data: {
      discordUserId: string;
      url: string;
      title?: string;
      description?: string;
      thumbnail?: string;
      createdAt?: string;
    },
  ) {
    try {
      // 유저 찾기
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      let user = await (this.prisma as any).user.findUnique({
        where: { discordId: data.discordUserId },
      });

      if (!user) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        user = await (this.prisma as any).user.create({
          data: {
            discordId: data.discordUserId,
            username: `User_${data.discordUserId.slice(-4)}`,
            role: 'VISITOR',
          },
        });
      }

      // 중복 체크
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existing = await (this.prisma as any).digging.findFirst({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          userId: user.id,
          url: data.url,
        },
      });

      if (existing) {
        throw new HttpException('Digging already exists', HttpStatus.CONFLICT);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await (this.prisma as any).digging.create({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          userId: user.id,
          url: data.url,
          title: data.title || null,
          description: data.description || '',
          thumbnail: data.thumbnail || null,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        },
      });
    } catch (error: unknown) {
      console.error('❌ Digging seed error:', error);
      const httpError = error as { status?: number };
      if (httpError.status === HttpStatus.CONFLICT) throw error;
      throw new HttpException(
        'Digging seed failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 식탁 방명록 시드
  // 임베드 메시지 형식:
  // dal._.gam_02444
  // @감자깡 joined voice channel ⁠🥄ㅣ식탁
  // ID: 1292027275717509140•오늘 오후 10:46
  @Post('table-logs/seed')
  async seedTableLog(
    @Body()
    data: {
      discordUserId: string;
      type?: 'VOICE_JOIN' | 'VOICE_LEAVE';
      timestamp?: string; // 새 형식
      date?: string; // 구 형식 (하위 호환)
      messageContent?: string;
      channelName?: string; // 구 형식
      messageId: string;
    },
  ) {
    try {
      // 중복 체크 (messageId로)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existing = await (this.prisma as any).tableLog.findUnique({
        where: { messageId: data.messageId },
      });

      if (existing) {
        throw new HttpException('TableLog already exists', HttpStatus.CONFLICT);
      }

      // 날짜 결정 (timestamp 우선, 없으면 date 사용)
      const logDate = data.timestamp
        ? new Date(data.timestamp)
        : data.date
          ? new Date(data.date)
          : new Date();

      // channelName 결정 (새 형식: type:messageContent, 구 형식: channelName)
      let channelName = data.channelName;
      if (data.type && data.messageContent) {
        channelName = `${data.type}:${data.messageContent}`;
      } else if (data.type) {
        channelName = data.type;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await (this.prisma as any).tableLog.create({
        data: {
          discordUserId: data.discordUserId,
          date: logDate,
          channelName,
          messageId: data.messageId,
        },
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.status === HttpStatus.CONFLICT) throw error;
      throw new HttpException(
        'TableLog seed failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
