import {
  Controller,
  Get,
  Post,
  Query,
  Headers,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

interface CreateTableLogDto {
  discordUserId: string;
  type: 'VOICE_JOIN' | 'VOICE_LEAVE';
  channelName: string;
  username?: string;
  durationMinutes?: number;
}

@Controller('table-logs')
export class TableLogsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private getUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  /**
   * 실시간 음성 활동 기록 (Discord Bot에서 호출)
   * POST /table-logs
   */
  @Post()
  async createTableLog(@Body() dto: CreateTableLogDto) {
    const now = new Date();
    
    // channelName에 type과 추가 정보 저장
    // 형식: "VOICE_JOIN:식탁:username" 또는 "VOICE_LEAVE:식탁:username:30분"
    let channelInfo = `${dto.type}:${dto.channelName}`;
    if (dto.username) {
      channelInfo += `:${dto.username}`;
    }
    if (dto.durationMinutes && dto.durationMinutes > 0) {
      channelInfo += `:${dto.durationMinutes}분`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const log = await (this.prisma as any).tableLog.create({
      data: {
        discordUserId: dto.discordUserId,
        date: now,
        channelName: channelInfo,
        // messageId는 null (실시간 로그는 Discord 메시지 ID가 없음)
      },
    });

    console.log(`📝 TableLog 생성: ${dto.username || dto.discordUserId} - ${dto.type} - ${dto.channelName}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return log;
  }

  // 유저의 식탁 참여 통계
  @Get('stats')
  async getUserStats(@Headers('Authorization') authHeader: string) {
    const userId = this.getUserId(authHeader);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { totalDays: 0, monthlyStats: [] };
    }

    // 총 참여 일수 (중복 날짜 제외)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const logs = await (this.prisma as any).tableLog.findMany({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { discordUserId: user.discordId },
      orderBy: { date: 'desc' },
    });

    // 고유 날짜 계산
    const uniqueDates = new Set<string>();
    const monthlyMap = new Map<string, number>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    logs.forEach((log: { date: Date }) => {
      const dateStr = log.date.toISOString().split('T')[0];
      uniqueDates.add(dateStr);

      const monthKey = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
    });

    // 월별 통계 정렬
    const monthlyStats = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      totalDays: uniqueDates.size,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      totalLogs: logs.length,
      monthlyStats,
    };
  }

  // 월별 전체 통계 (관리자용)
  @Get('monthly')
  async getMonthlyStats(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const logs = await (this.prisma as any).tableLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 유저별 참여 횟수
    const userCountMap = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    logs.forEach((log: { discordUserId: string }) => {
      userCountMap.set(log.discordUserId, (userCountMap.get(log.discordUserId) || 0) + 1);
    });

    // 유저 정보 가져오기
    const discordIds = Array.from(userCountMap.keys());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const users = await (this.prisma as any).user.findMany({
      where: { discordId: { in: discordIds } },
      select: { discordId: true, username: true },
    });

    const userMap = new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    users.forEach((u: { discordId: string; username: string }) => {
      userMap.set(u.discordId, u.username);
    });

    const userStats = Array.from(userCountMap.entries())
      .map(([discordId, count]) => ({
        discordId,
        username: userMap.get(discordId) || `User_${discordId.slice(-4)}`,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      year: targetYear,
      month: targetMonth,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      totalLogs: logs.length,
      uniqueUsers: userCountMap.size,
      userStats,
    };
  }

  // 리더보드 (전체 기간)
  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const logs = await (this.prisma as any).tableLog.findMany();

    // 유저별 고유 날짜 수 계산
    const userDaysMap = new Map<string, Set<string>>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    logs.forEach((log: { discordUserId: string; date: Date }) => {
      if (!userDaysMap.has(log.discordUserId)) {
        userDaysMap.set(log.discordUserId, new Set());
      }
      const dateStr = log.date.toISOString().split('T')[0];
      userDaysMap.get(log.discordUserId)!.add(dateStr);
    });

    // 유저 정보 가져오기
    const discordIds = Array.from(userDaysMap.keys());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const users = await (this.prisma as any).user.findMany({
      where: { discordId: { in: discordIds } },
      select: { discordId: true, username: true },
    });

    const userMap = new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    users.forEach((u: { discordId: string; username: string }) => {
      userMap.set(u.discordId, u.username);
    });

    const leaderboard = Array.from(userDaysMap.entries())
      .map(([discordId, daysSet]) => ({
        discordId,
        username: userMap.get(discordId) || `User_${discordId.slice(-4)}`,
        totalDays: daysSet.size,
      }))
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, limitNum);

    return leaderboard;
  }

  // 월간 리더보드 (이용시간 + 이용횟수)
  @Get('monthly-leaderboard')
  async getMonthlyLeaderboard(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const logs = await (this.prisma as any).tableLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 유저별 이용시간 및 횟수 계산
    const userStatsMap = new Map<
      string,
      { totalMinutes: number; visitCount: number; dates: Set<string> }
    >();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    logs.forEach((log: { discordUserId: string; date: Date; channelName: string | null }) => {
      if (!userStatsMap.has(log.discordUserId)) {
        userStatsMap.set(log.discordUserId, {
          totalMinutes: 0,
          visitCount: 0,
          dates: new Set(),
        });
      }
      const stats = userStatsMap.get(log.discordUserId)!;

      // channelName에서 duration 추출 (형식: "VOICE_LEAVE:식탁:username:30분")
      if (log.channelName) {
        const parts = log.channelName.split(':');
        if (parts[0] === 'VOICE_LEAVE' && parts.length >= 4) {
          const durationStr = parts[parts.length - 1];
          const minutes = parseInt(durationStr.replace('분', ''));
          if (!isNaN(minutes)) {
            stats.totalMinutes += minutes;
          }
        }
        // 방문 횟수는 JOIN 또는 모든 기록 카운트
        if (parts[0] === 'VOICE_JOIN' || !parts[0].startsWith('VOICE_')) {
          stats.visitCount += 1;
        }
      } else {
        // 이전 형식의 로그 (channelName만 있음)
        stats.visitCount += 1;
      }

      const dateStr = log.date.toISOString().split('T')[0];
      stats.dates.add(dateStr);
    });

    // 유저 정보 가져오기
    const discordIds = Array.from(userStatsMap.keys());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const users = await (this.prisma as any).user.findMany({
      where: { discordId: { in: discordIds } },
      select: { id: true, discordId: true, username: true },
    });

    const userMap = new Map<string, { id: string; username: string }>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    users.forEach((u: { id: string; discordId: string; username: string }) => {
      userMap.set(u.discordId, { id: u.id, username: u.username });
    });

    // 이용시간 기준 정렬
    const timeLeaderboard = Array.from(userStatsMap.entries())
      .map(([discordId, stats]) => ({
        discordId,
        userId: userMap.get(discordId)?.id,
        username: userMap.get(discordId)?.username || `User_${discordId.slice(-4)}`,
        totalMinutes: stats.totalMinutes,
        visitCount: stats.visitCount,
        uniqueDays: stats.dates.size,
      }))
      .filter((u) => u.totalMinutes > 0)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // 방문횟수 기준 정렬
    const visitLeaderboard = Array.from(userStatsMap.entries())
      .map(([discordId, stats]) => ({
        discordId,
        userId: userMap.get(discordId)?.id,
        username: userMap.get(discordId)?.username || `User_${discordId.slice(-4)}`,
        totalMinutes: stats.totalMinutes,
        visitCount: stats.visitCount,
        uniqueDays: stats.dates.size,
      }))
      .filter((u) => u.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount);

    return {
      year: targetYear,
      month: targetMonth,
      timeLeaderboard: timeLeaderboard.slice(0, 10),
      visitLeaderboard: visitLeaderboard.slice(0, 10),
    };
  }
}
