import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateDiggingDto } from './dto/create-digging.dto';
import { UpdateDiggingDto } from './dto/update-digging.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiggingFromBotDto } from './dto/create-digging-from-bot.dto';

@Injectable()
export class DiggingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDiggingDto: CreateDiggingDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.create({
      data: {
        ...createDiggingDto,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async createFromBot(createDiggingFromBotDto: CreateDiggingFromBotDto) {
    const { discordId, ...rest } = createDiggingFromBotDto;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { discordId },
    });
    if (!user) throw new BadRequestException('사용자를 찾을 수 없습니다.');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.create({
      data: {
        ...rest,
        description: rest.description || '',
        thumbnail: rest.thumbnail || null,
        user: {
          connect: {
            discordId: discordId,
          },
        },
      },
    });
  }

  // 내 디깅만 조회
  async findAll(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
      },
    });
  }

  // 전체 디깅 조회 (페이지네이션)
  async findAllPublic(page: number = 1, limit: number = 20, hashtag?: string) {
    const skip = (page - 1) * limit;

    const where = hashtag ? { hashtags: { has: hashtag } } : {};

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const [diggings, total]: [unknown[], number] = await Promise.all([
      (this.prisma as any).digging.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true } },
        },
      }),
      (this.prisma as any).digging.count({ where }),
    ]);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    return {
      data: diggings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + diggings.length < total,
      },
    };
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true } },
      },
    });
  }

  async update(id: string, updateDiggingDto: UpdateDiggingDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.update({
      where: { id },
      data: updateDiggingDto,
    });
  }

  async remove(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.delete({
      where: { id },
    });
  }
}
