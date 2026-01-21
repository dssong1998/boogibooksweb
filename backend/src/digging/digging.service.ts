import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateDiggingDto } from './dto/create-digging.dto';
import { UpdateDiggingDto } from './dto/update-digging.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from 'src/users/entities/user.entity';
import { CreateDiggingFromBotDto } from './dto/create-digging-from-bot.dto';

@Injectable()
export class DiggingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDiggingDto: CreateDiggingDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.create({
      data: {
        ...createDiggingDto,
        user:{
          connect:{
            id:userId,
      },
    }}});
  }

  async createFromBot(createDiggingFromBotDto:CreateDiggingFromBotDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const {discordId, ...rest} = createDiggingFromBotDto
    const user = await (this.prisma as any).user.findUnique({
      where: { discordId, },
    });
    if(!user) throw new BadRequestException('사용자를 찾을 수 없습니다.')
    return await (this.prisma as any).digging.create({
      data: {
        ...rest,
        user:{
          connect:{
            discordId:discordId,
      },
    }}});
  }

  async findAll(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).digging.findUnique({
      where: { id },
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
