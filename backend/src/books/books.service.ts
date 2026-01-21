import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookFromBotDto } from './dto/create-book-from-bot.dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createBookDto: CreateBookDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).book.create({
      data: {
        ...createBookDto,
        userId,
      },
    });
  }

    async createFromBot(createBookFromBotDto: CreateBookFromBotDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const {discordId, ...rest} = createBookFromBotDto
    const user = await (this.prisma as any).user.findUnique({
      where: { discordId, },
    });
    if(!user) throw new BadRequestException('사용자를 찾을 수 없습니다.')
    return await (this.prisma as any).book.create({
      data: {
        ...rest,
        user:{
          connect:{
            discordId:discordId,
      },
    }}});
  }

  async findAll(userId: string) {
    // 특정 사용자의 모든 책 조회
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).book.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).book.findUnique({
      where: { id },
      include: {
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, updateBookDto: UpdateBookDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).book.update({
      where: { id },
      data: updateBookDto,
    });
  }

  async remove(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).book.delete({
      where: { id },
    });
  }

  async searchNaver(query: string, display = 10) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Naver API credentials not configured');
    }

    const response = await fetch(
      `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=${display}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to search books from Naver');
    }

    return response.json();
  }
}
