import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private yearMonthFromDate(d: Date): { year: number; month: number } {
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  private currentYearMonth(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  async getCurrentMonthSnapshot(discordUserId: string): Promise<{
    hasActivity: boolean;
    messageCount: number;
  } | null> {
    const { year, month } = this.currentYearMonth();
    const row = await this.prisma.libraryActivityMonth.findUnique({
      where: {
        discordUserId_year_month: { discordUserId, year, month },
      },
    });
    if (!row) return null;
    return {
      hasActivity: row.hasActivity,
      messageCount: row.messageCount,
    };
  }

  /**
   * 봇에서 서재 유효 활동(메시지 또는 포럼 포스트 생성)을 푸시할 때 호출.
   * sourceId로 중복 반영을 막습니다.
   */
  async recordBotSignal(dto: {
    discordUserId: string;
    sourceId: string;
    kind: 'message' | 'thread';
    occurredAt: string;
  }): Promise<{ ok: boolean; duplicate: boolean }> {
    const existing = await this.prisma.libraryActivityAck.findUnique({
      where: { sourceId: dto.sourceId },
    });
    if (existing) {
      return { ok: true, duplicate: true };
    }

    const occurredDate = new Date(dto.occurredAt);
    const { year, month } = Number.isNaN(occurredDate.getTime())
      ? this.currentYearMonth()
      : this.yearMonthFromDate(occurredDate);

    await this.prisma.$transaction([
      this.prisma.libraryActivityAck.create({
        data: {
          sourceId: dto.sourceId,
          discordUserId: dto.discordUserId,
        },
      }),
      this.prisma.libraryActivityMonth.upsert({
        where: {
          discordUserId_year_month: {
            discordUserId: dto.discordUserId,
            year,
            month,
          },
        },
        create: {
          discordUserId: dto.discordUserId,
          year,
          month,
          messageCount: 1,
          hasActivity: true,
        },
        update: {
          messageCount: { increment: 1 },
          hasActivity: true,
        },
      }),
    ]);

    return { ok: true, duplicate: false };
  }
}
