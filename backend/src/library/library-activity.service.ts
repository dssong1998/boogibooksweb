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

  /** 이벤트 자격 판단용: validForEventCount > 0 이면 hasActivity true */
  async getCurrentMonthSnapshot(discordUserId: string): Promise<{
    hasActivity: boolean;
    messageCount: number;
    validForEventCount: number;
  } | null> {
    const { year, month } = this.currentYearMonth();
    const row = await this.prisma.libraryActivityMonth.findUnique({
      where: {
        discordUserId_year_month: { discordUserId, year, month },
      },
    });
    if (!row) return null;
    const validForEventCount = row.validForEventCount;
    return {
      hasActivity: validForEventCount > 0,
      messageCount: row.messageCount,
      validForEventCount,
    };
  }

  /**
   * 봇에서 서재 활동(메시지/스레드) 전부 푸시.
   * isValidForEvent: 이벤트 신청 자격 규칙 충족 여부(별도 집계).
   * sourceId로 중복 반영을 막습니다.
   */
  async recordBotSignal(dto: {
    discordUserId: string;
    sourceId: string;
    kind: 'message' | 'thread';
    occurredAt: string;
    isValidForEvent: boolean;
  }): Promise<{ ok: boolean; duplicate: boolean }> {
    // 유효 활동만 집계/저장
    if (!dto.isValidForEvent) {
      return { ok: true, duplicate: false };
    }

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
          isValidForEvent: true,
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
          validForEventCount: 1,
        },
        update: {
          messageCount: { increment: 1 },
          validForEventCount: { increment: 1 },
        },
      }),
    ]);

    return { ok: true, duplicate: false };
  }
}
