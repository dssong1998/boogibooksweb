import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LibraryActivityService } from '../library/library-activity.service';

interface DiscordMessage {
  id: string;
  author: { id: string };
  timestamp: string;
  content?: string;
}

interface DiscordThread {
  id: string;
  parent_id: string;
  owner_id?: string; // 스레드 생성자
}

interface DiscordDMChannel {
  id: string;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libraryActivity: LibraryActivityService,
  ) {}

  async create(createEventDto: CreateEventDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).event.create({
      data: {
        ...createEventDto,
        date: new Date(createEventDto.date),
      },
    });
  }

  async findAll() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).event.findMany({
      include: {
        applications: {
          orderBy: { applicationOrder: 'asc' },
        },
      },
    });
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).event.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { applicationOrder: 'asc' },
        },
      },
    });
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).event.update({
      where: { id },
      data: updateEventDto,
    });
  }

  async remove(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).event.delete({
      where: { id },
    });
  }

  // 디스코드 서재 채널(포럼)에서 이번 달 활동 확인
  // 엄격한 조건:
  // 1. 포스트(스레드)를 직접 생성한 경우
  // 2. 메시지가 Preview, Review, 프리뷰, 리뷰로 시작 (기호/이모지 제외)
  // 3. 메시지가 1000자 이상인 경우
  // 전체 개수를 카운트하여 반환
  async checkLibraryActivity(
    discordUserId: string,
  ): Promise<{ hasActivity: boolean; messageCount: number }> {
    const snapshot =
      await this.libraryActivity.getCurrentMonthSnapshot(discordUserId);
    if (snapshot?.hasActivity) {
      return {
        hasActivity: true,
        messageCount: snapshot.messageCount,
      };
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const libraryChannelId = process.env.DISCORD_LIBRARY_CHANNEL_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!botToken || !libraryChannelId) {
      console.warn('Discord bot token or library channel ID not configured');
      return { hasActivity: false, messageCount: 0 };
    }

    // 메시지가 조건에 맞는지 확인하는 헬퍼 함수
    const isValidMessage = (content: string | undefined): boolean => {
      if (!content) return false;

      // 1000자 이상이면 유효
      if (content.length >= 1000) return true;

      // 기호와 이모지를 제거하고 텍스트만 추출
      const cleanedContent = content
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[<>[\]{}()#*_~`|\\!@$%^&+=:;'",.?/-]/g, '')
        .trim();

      // Preview, Review, 프리뷰, 리뷰로 시작하는지 확인
      const prefixRegex = /^(preview|review|프리뷰|리뷰)/i;
      return prefixRegex.test(cleanedContent);
    };

    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const discordEpoch = 1420070400000;
      const afterSnowflake =
        BigInt(firstDayOfMonth.getTime() - discordEpoch) << BigInt(22);

      const headers = { Authorization: `Bot ${botToken}` };
      let totalValidCount = 0;
      let isValid: boolean = false;
      if (guildId) {
        const activeUrl = `https://discord.com/api/v10/guilds/${guildId}/threads/active`;
        const archivedUrl = `https://discord.com/api/v10/channels/${libraryChannelId}/threads/archived/public?limit=50`;

        const [activeThreadsResponse, archivedThreadsResponse] =
          await Promise.all([
            fetch(activeUrl, { headers }),
            fetch(archivedUrl, { headers }),
          ]);

        const allThreads: DiscordThread[] = [];

        if (activeThreadsResponse.ok) {
          const activeData = (await activeThreadsResponse.json()) as {
            threads: DiscordThread[];
          };
          const libraryThreads = activeData.threads.filter(
            (t) => t.parent_id === libraryChannelId,
          );
          allThreads.push(...libraryThreads);
        }

        if (archivedThreadsResponse.ok) {
          const archivedData = (await archivedThreadsResponse.json()) as {
            threads: DiscordThread[];
          };
          allThreads.push(...archivedData.threads);
        }

        // 조건 1: 이번 달에 스레드(포스트)를 직접 생성한 경우
        for (const thread of allThreads) {
          if (thread.owner_id === discordUserId) {
            const threadTimestamp =
              Number(BigInt(thread.id) >> BigInt(22)) + discordEpoch;
            if (threadTimestamp >= firstDayOfMonth.getTime()) {
              isValid = true;
              totalValidCount++;
            }
          }
        }

        // 조건 2, 3: 스레드 내 메시지 확인 (병렬 처리)
        const batchSize = 10;
        for (let i = 0; i < allThreads.length; i += batchSize) {
          const batch = allThreads.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (thread) => {
              const msgUrl = `https://discord.com/api/v10/channels/${thread.id}/messages?limit=100&after=${afterSnowflake.toString()}`;
              const res = await fetch(msgUrl, { headers });
              if (!res.ok) return 0;

              const msgs: DiscordMessage[] =
                (await res.json()) as DiscordMessage[];

              let count = 0;
              for (const msg of msgs) {
                if (msg.author.id === discordUserId) {
                  count++;
                  if (!isValid && isValidMessage(msg.content)) {
                    isValid = true;
                  }
                }
              }
              return count;
            }),
          );
          totalValidCount += results.reduce((a, b) => a + b, 0);
        }
      }

      console.log(
        `Library activity for user ${discordUserId}: ${totalValidCount} valid activities`,
      );
      return {
        hasActivity: isValid,
        messageCount: totalValidCount,
      };
    } catch (error) {
      console.error('Error checking library activity:', error);
      return { hasActivity: false, messageCount: 0 };
    }
  }

  // 이벤트 신청 자격 확인 (프론트엔드 표시용)
  async checkApplicationEligibility(
    userId: string,
    eventId: string,
  ): Promise<{
    eligible: boolean;
    reason?: string;
    isFree: boolean;
    isOverCapacity: boolean;
    libraryMessageCount: number;
    alreadyApplied: boolean;
    existingStatus?: string;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('사용자를 찾을 수 없습니다.');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const event = await this.findOne(eventId);
    if (!event) throw new BadRequestException('이벤트를 찾을 수 없습니다.');

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const userRole = user.role as string;
    const isTerras = user.isTerras as boolean;
    const isNewMember = user.isNewMember as boolean;
    const maxParticipants = event.maxParticipants as number;
    const discordId = user.discordId as string;
    // applications 배열 길이로 현재 참가자 수 계산
    const currentParticipants = (event.applications?.length ?? 0) as number;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    // VISITOR는 이벤트 신청 불가
    const isVisitor = userRole === 'VISITOR';

    // OTHER 타입은 모두 유료(결제). 그 외에는 테라스/뉴멤버 무료
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
    const eventType = event?.eventType as string | undefined;
    const isFree = eventType === 'OTHER' ? false : isTerras || isNewMember;

    // 이미 신청했는지 확인
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const existingApplication = await (
      this.prisma as any
    ).eventApplication.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    // 서재 활동 확인 (뉴멤버는 스킵)
    const libraryActivity =
      // eslint-disable-next-line
      isNewMember || event?.eventType !== 'MEETING'
        ? { hasActivity: true, messageCount: 0 }
        : await this.checkLibraryActivity(discordId);

    const currentOrder = currentParticipants + 1;
    const isOverCapacity = currentOrder > maxParticipants;

    // VISITOR는 이벤트 신청 불가
    if (isVisitor) {
      return {
        eligible: false,
        reason: '디스코드 서버 멤버만 이벤트에 신청할 수 있습니다.',
        isFree,
        isOverCapacity: false,
        libraryMessageCount: 0,
        alreadyApplied: false,
      };
    }

    if (existingApplication) {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      const existingStatus = existingApplication.status as string;
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      return {
        eligible: false,
        reason: '이미 이 이벤트에 신청하셨습니다.',
        isFree,
        isOverCapacity,
        libraryMessageCount: libraryActivity.messageCount,
        alreadyApplied: true,
        existingStatus,
      };
    }

    // 뉴멤버가 아닌 경우에만 서재 활동 체크
    if (
      !isNewMember &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      event?.eventType === 'MEETING' &&
      !libraryActivity.hasActivity
    ) {
      return {
        eligible: false,
        reason:
          '이번 달 서재 채널에 유효한 글을 1개 이상 작성해야 신청할 수 있습니다.',
        isFree,
        isOverCapacity,
        libraryMessageCount: libraryActivity.messageCount,
        alreadyApplied: false,
      };
    }

    return {
      eligible: true,
      isOverCapacity,
      isFree,
      libraryMessageCount: libraryActivity.messageCount,
      alreadyApplied: false,
    };
  }

  // 이벤트 신청
  // - 테라스 멤버: 바로 CONFIRMED
  // - 코인 사용: COIN_GUARANTEED (정원 외 보장)
  // - 일반: PENDING (관리자 승인 대기)
  async applyToEvent(
    userId: string,
    eventId: string,
    useCoins: boolean = false,
  ): Promise<{
    success: boolean;
    applicationOrder: number;
    status: string;
    usedCoins: number;
    message: string;
    isFree: boolean;
    libraryMessageCount: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('사용자를 찾을 수 없습니다.');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const event = await this.findOne(eventId);
    if (!event) throw new BadRequestException('이벤트를 찾을 수 없습니다.');

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const userRole = user.role as string;
    const isTerras = user.isTerras as boolean;
    const isNewMember = user.isNewMember as boolean;
    const discordId = user.discordId as string;
    const userCoins = user.coins as number;
    const requiredCoins = event.requiredCoins as number;
    const maxParticipants = event.maxParticipants as number;
    // applications 배열 길이로 현재 참가자 수 계산
    const currentParticipants = (event.applications?.length ?? 0) as number;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    // VISITOR는 이벤트 신청 불가
    if (userRole === 'VISITOR') {
      throw new ForbiddenException(
        '디스코드 서버 멤버만 이벤트에 신청할 수 있습니다.',
      );
    }

    // 이미 신청했는지 확인
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const existingApplication = await (
      this.prisma as any
    ).eventApplication.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    if (existingApplication) {
      throw new BadRequestException('이미 이 이벤트에 신청하셨습니다.');
    }

    // 서재 활동 확인 (뉴멤버는 스킵)
    let libraryActivity = { hasActivity: true, messageCount: 0 };
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
    if (event.eventType === 'MEETING') {
      libraryActivity = isNewMember
        ? { hasActivity: true, messageCount: 0 }
        : await this.checkLibraryActivity(discordId);
      if (!isNewMember && !libraryActivity.hasActivity) {
        throw new ForbiddenException(
          '이번 달 서재 채널에 유효한 글을 1개 이상 작성해야 신청할 수 있습니다.',
        );
      }
    }

    const applicationOrder = currentParticipants + 1;
    const isOverCapacity = applicationOrder > maxParticipants;

    let usedCoins = 0;
    let status = 'PENDING'; // 기본: 관리자 승인 대기

    // OTHER: 선착순 자동 승인 → 결제 대기(APPROVED), 테라스/뉴멤버 구분 없이 모두 결제
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
    const eventTypeApply = event.eventType as string;
    if (eventTypeApply === 'OTHER') {
      status = 'APPROVED';
    }
    // 뉴멤버 또는 MEETING이 아닌 타입: 바로 CONFIRMED (승인 없이 확정)
    else if (isNewMember || eventTypeApply !== 'MEETING') {
      status = 'CONFIRMED';
    }
    // 코인 사용: COIN_GUARANTEED (정원 외 보장)
    else if (useCoins) {
      if (userCoins < requiredCoins) {
        throw new BadRequestException(
          `코인이 부족합니다. 필요: ${requiredCoins}, 보유: ${userCoins}`,
        );
      }
      usedCoins = requiredCoins;
      status = 'COIN_GUARANTEED';

      // 코인 차감
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: { coins: { decrement: usedCoins } },
      });
    }
    // 일반 신청: PENDING (관리자 승인 대기)

    const isOtherEvent = eventTypeApply === 'OTHER';

    // 신청 생성 (서재 활동 수, 뉴멤버 여부 기록)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).eventApplication.create({
      data: {
        event: {
          connect: {
            id: eventId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        applicationOrder,
        status,
        usedCoins,
        libraryMessageCount: libraryActivity.messageCount,
        isNewMember, // 신청 시점의 뉴멤버 여부 기록
        paidAt: isOtherEvent ? null : isNewMember ? new Date() : null,
        approvedAt: isOtherEvent || isNewMember ? new Date() : null,
      },
    });

    // OTHER: 선착순 자동 승인 → 결제 안내 DM 전송 (테라스/뉴멤버 동일)
    if (isOtherEvent) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
      const eventPrice = Number(event.price) || 0;
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
      const eventTitle = String(event.title);
      await this.sendPaymentDM(
        discordId,
        userId,
        eventId,
        eventTitle,
        eventPrice,
        applicationOrder,
        false,
        0,
      );
      const otherMessage = `${applicationOrder}번째로 신청되었습니다. 선착순 자동 승인되어 결제 안내를 확인해 주세요.`;
      return {
        success: true,
        applicationOrder,
        status,
        usedCoins,
        isFree: false,
        message: otherMessage,
        libraryMessageCount: libraryActivity.messageCount,
      };
    }

    // 뉴멤버는 isNewMember 플래그 해제 (첫 모임 무료 혜택 사용)
    if (isNewMember) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: { isNewMember: false },
      });

      // 뉴멤버에게 참석 확정 DM 전송
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      const eventTitle = event.title as string;
      const eventLocation = event.location as string;
      const eventDate = event.date as Date;
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      await this.sendConfirmationDM(
        discordId,
        eventTitle,
        eventLocation,
        eventDate,
        false,
        0,
        true, // isNewMember
      );
    }

    // 참가자 수는 applications 배열 길이로 자동 계산되므로 별도 업데이트 불필요

    let message: string;
    if (isNewMember) {
      message = `🎉 ${applicationOrder}번째로 참석이 확정되었습니다! (뉴멤버 첫 모임 무료) 디스코드 DM으로 이벤트 정보가 전송되었습니다.`;
    } else if (useCoins) {
      message = `${applicationOrder}번째로 신청되었습니다. 코인 ${usedCoins}개를 사용하여 정원 외 보장됩니다. 정원이 차면 자동으로 참석이 확정됩니다.`;
    } else if (isTerras) {
      message = `${applicationOrder}번째로 신청되었습니다. 관리자 승인 후 참석 확정 안내를 받으실 수 있습니다. (테라스 멤버 무료)`;
    } else if (isOverCapacity) {
      message = `${applicationOrder}번째로 신청되었습니다. 정원 초과이므로 관리자 승인 후 결제 안내를 받으실 수 있습니다.`;
    } else {
      message = `${applicationOrder}번째로 신청되었습니다. 관리자 승인 후 결제 안내를 받으실 수 있습니다.`;
    }

    return {
      success: true,
      applicationOrder,
      status,
      usedCoins,
      isFree: isTerras || isNewMember, // 테라스 또는 뉴멤버는 무료
      message,
      libraryMessageCount: libraryActivity.messageCount,
    };
  }

  // 관리자: 신청 승인 (여러 명 동시 승인 가능)
  // 테라스 멤버/뉴멤버 → CONFIRMED + 참석 확정 DM
  // 일반 멤버 → APPROVED + 결제 안내 DM
  // 코인 사용자 승인 시 → 코인 반환 + 이달의 멤버 선정 DM
  // finalizeApproval=true → 미승인 PENDING 신청자에게 거절 DM 전송
  async approveApplications(
    eventId: string,
    applicationIds: string[],
    finalizeApproval: boolean = false,
  ): Promise<{
    approved: number;
    coinRefunded: { userId: string; coins: number; discordId: string }[];
    dmSent: number;
    autoApprovedCoinUsers: number;
    rejectedCount: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const event = await this.findOne(eventId);
    if (!event) throw new BadRequestException('이벤트를 찾을 수 없습니다.');

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const eventTitle = event.title as string;
    const eventPrice = event.price as number;
    const eventLocation = event.location as string;
    const eventDate = event.date as Date;
    const maxParticipants = event.maxParticipants as number;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    const coinRefunded: {
      userId: string;
      coins: number;
      discordId: string;
    }[] = [];
    // 테라스 멤버와 뉴멤버 (무료 확정)
    const freeUsers: { discordId: string; isNewMember: boolean }[] = [];
    const paymentUsers: {
      userId: string;
      discordId: string;
      applicationOrder: number;
    }[] = [];

    for (const appId of applicationIds) {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      const application = await (
        this.prisma as any
      ).eventApplication.findUnique({
        where: { id: appId },
        include: { user: true },
      });

      if (!application) continue;
      const appEventId = application.eventId as string;
      const appStatus = application.status as string;
      if (appEventId !== eventId) continue;
      if (appStatus === 'CONFIRMED' || appStatus === 'APPROVED') continue;

      const usedCoins = application.usedCoins as number;
      const appUserId = application.userId as string;
      const userDiscordId = application.user.discordId as string;
      const userIsTerras = application.user.isTerras as boolean;
      const appIsNewMember = application.isNewMember as boolean; // 신청 시점의 뉴멤버 여부
      const appOrder = application.applicationOrder as number;

      // 코인 사용자가 승인되면 코인 반환 + 이달의 멤버 선정
      if (usedCoins > 0) {
        await (this.prisma as any).user.update({
          where: { id: appUserId },
          data: { coins: { increment: usedCoins } },
        });
        coinRefunded.push({
          userId: appUserId,
          coins: usedCoins,
          discordId: userDiscordId,
        });

        // 코인 사용자는 바로 CONFIRMED (이달의 멤버)
        await (this.prisma as any).eventApplication.update({
          where: { id: appId },
          data: {
            status: 'CONFIRMED',
            approvedAt: new Date(),
            usedCoins: 0,
            paidAt: new Date(),
          },
        });

        // 코인 반환 + 참석 확정 DM 전송
        await this.sendConfirmationDM(
          userDiscordId,
          eventTitle,
          eventLocation,
          eventDate,
          true,
          usedCoins,
        );
        continue;
      }

      const eventTypeApprove = event.eventType as string;
      const isOtherEvent = eventTypeApprove === 'OTHER';

      // OTHER 이벤트: 테라스/뉴멤버 구분 없이 모두 APPROVED + 결제 안내
      if (isOtherEvent) {
        await (this.prisma as any).eventApplication.update({
          where: { id: appId },
          data: { status: 'APPROVED', approvedAt: new Date() },
        });
        paymentUsers.push({
          userId: appUserId,
          discordId: userDiscordId,
          applicationOrder: appOrder,
        });
      }
      // 테라스 멤버 또는 뉴멤버: CONFIRMED + 참석 확정 DM (무료)
      else if (userIsTerras || appIsNewMember) {
        await (this.prisma as any).eventApplication.update({
          where: { id: appId },
          data: {
            status: 'CONFIRMED',
            approvedAt: new Date(),
            paidAt: new Date(),
          },
        });
        freeUsers.push({
          discordId: userDiscordId,
          isNewMember: appIsNewMember,
        });

        // 뉴멤버가 승인되면 isNewMember 플래그 해제 (첫 모임 무료 혜택 사용)
        if (appIsNewMember) {
          await (this.prisma as any).user.update({
            where: { id: appUserId },
            data: { isNewMember: false },
          });
        }
      } else {
        // 일반 멤버: APPROVED + 결제 안내 DM
        await (this.prisma as any).eventApplication.update({
          where: { id: appId },
          data: { status: 'APPROVED', approvedAt: new Date() },
        });
        paymentUsers.push({
          userId: appUserId,
          discordId: userDiscordId,
          applicationOrder: appOrder,
        });
      }
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    // DM 전송
    let dmSent = 0;

    // 테라스 멤버/뉴멤버에게 참석 확정 DM
    for (const user of freeUsers) {
      const sent = await this.sendConfirmationDM(
        user.discordId,
        eventTitle,
        eventLocation,
        eventDate,
        false,
        0,
        user.isNewMember, // 뉴멤버 여부 전달
      );
      if (sent) dmSent++;
    }

    // 일반 멤버에게 결제 안내 DM
    for (const user of paymentUsers) {
      const sent = await this.sendPaymentDM(
        user.discordId,
        user.userId,
        eventId,
        eventTitle,
        eventPrice,
        user.applicationOrder,
        false,
        0,
      );
      if (sent) dmSent++;
    }

    // 정원 확인 후 코인 사용자 자동 승인
    const autoApproved = await this.checkAndAutoApproveCoinUsers(
      eventId,
      eventTitle,
      eventLocation,
      eventDate,
      maxParticipants,
    );

    // finalizeApproval이 true면 미승인 PENDING 신청자에게 거절 DM 전송
    let rejectedCount = 0;
    if (finalizeApproval) {
      rejectedCount = await this.sendRejectionToRemainingApplicants(
        eventId,
        eventTitle,
      );
    }

    return {
      approved: applicationIds.length,
      coinRefunded,
      dmSent,
      autoApprovedCoinUsers: autoApproved,
      rejectedCount,
    };
  }

  // 미승인 PENDING 신청자에게 거절 DM 전송
  private async sendRejectionToRemainingApplicants(
    eventId: string,
    eventTitle: string,
  ): Promise<number> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    // PENDING 또는 COIN_GUARANTEED 상태의 신청자들 조회
    const pendingApplications = await (
      this.prisma as any
    ).eventApplication.findMany({
      where: {
        eventId,
        status: { in: ['PENDING', 'COIN_GUARANTEED'] },
      },
      include: { user: true },
    });

    let rejectedCount = 0;
    for (const app of pendingApplications as any[]) {
      const userDiscordId = app.user.discordId as string;
      const usedCoins = app.usedCoins as number;
      const appUserId = app.userId as string;

      // 코인 사용자는 코인 환불
      if (usedCoins > 0) {
        await (this.prisma as any).user.update({
          where: { id: appUserId },
          data: { coins: { increment: usedCoins } },
        });
      }

      // 상태를 CANCELLED로 변경
      await (this.prisma as any).eventApplication.update({
        where: { id: app.id },
        data: { status: 'CANCELLED' },
      });

      // 거절 DM 전송
      const sent = await this.sendRejectionDM(userDiscordId, eventTitle);
      if (sent) rejectedCount++;
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    return rejectedCount;
  }

  // 정원 도달 시 코인 사용자 자동 승인
  private async checkAndAutoApproveCoinUsers(
    eventId: string,
    eventTitle: string,
    eventLocation: string,
    eventDate: Date,
    maxParticipants: number,
  ): Promise<number> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    // 현재 CONFIRMED 수 확인
    const confirmedCount = await (this.prisma as any).eventApplication.count({
      where: { eventId, status: 'CONFIRMED' },
    });

    // 정원 미달이면 자동 승인 안 함
    if (confirmedCount < maxParticipants) return 0;

    // COIN_GUARANTEED 상태인 신청자들 찾기
    const coinUsers = await (this.prisma as any).eventApplication.findMany({
      where: { eventId, status: 'COIN_GUARANTEED' },
      include: { user: true },
    });

    let autoApproved = 0;
    for (const app of coinUsers as any[]) {
      const usedCoins = app.usedCoins as number;
      const userDiscordId = app.user.discordId as string;

      // CONFIRMED로 변경 (코인 사용 유지)
      await (this.prisma as any).eventApplication.update({
        where: { id: app.id },
        data: {
          status: 'CONFIRMED',
          approvedAt: new Date(),
          paidAt: new Date(),
        },
      });

      // 코인 사용 확정 DM 전송
      await this.sendCoinUsedDM(
        userDiscordId,
        eventTitle,
        eventLocation,
        eventDate,
        usedCoins,
      );
      autoApproved++;
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    return autoApproved;
  }

  // 참석 확정 DM (테라스 멤버, 뉴멤버 또는 코인 반환 시)
  private async sendConfirmationDM(
    discordId: string,
    eventTitle: string,
    location: string,
    date: Date,
    isCoinRefunded: boolean,
    refundedCoins: number,
    isNewMember: boolean = false,
  ): Promise<boolean> {
    const dateStr = date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fields = [
      { name: '📍 장소', value: location, inline: true },
      { name: '📅 일시', value: dateStr, inline: true },
    ];

    if (isCoinRefunded && refundedCoins > 0) {
      fields.push({
        name: '✨ 이달의 멤버',
        value: `코인 ${refundedCoins}개가 반환되었습니다!`,
        inline: false,
      });
    }

    let description = '당일 뵙겠습니다! 🙌';
    if (isNewMember) {
      description =
        '🌟 뉴멤버 첫 모임 무료 혜택으로 참석이 확정되었습니다!\n당일 뵙겠습니다! 🙌';
    }

    return this.sendDiscordDM(discordId, {
      title: `🎉 [${eventTitle}] 참석 확정!`,
      description,
      color: 0x57f287, // 초록색
      fields,
    });
  }

  // 거절 DM (승인되지 않은 신청자에게)
  private async sendRejectionDM(
    discordId: string,
    eventTitle: string,
  ): Promise<boolean> {
    return this.sendDiscordDM(discordId, {
      title: `📬 [${eventTitle}] 신청 결과 안내`,
      description:
        '안타깝게도 이번 모임에 참석이 어렵게 되었습니다.\n\n다음 모임에서 뵙기를 기대합니다! 🙏',
      color: 0xed4245, // 빨간색
      fields: [],
    });
  }

  // 코인 사용 확정 DM (정원 도달 시 자동 승인)
  private async sendCoinUsedDM(
    discordId: string,
    eventTitle: string,
    location: string,
    date: Date,
    usedCoins: number,
  ): Promise<boolean> {
    const dateStr = date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return this.sendDiscordDM(discordId, {
      title: `🎉 [${eventTitle}] 참석 확정!`,
      description: `코인 ${usedCoins}개를 사용하여 정원 외 참석이 확정되었습니다.\n당일 뵙겠습니다! 🙌`,
      color: 0x57f287, // 초록색
      fields: [
        { name: '📍 장소', value: location, inline: true },
        { name: '📅 일시', value: dateStr, inline: true },
      ],
    });
  }

  // 이벤트 신청자 목록 조회 (관리자용)
  // 코인 사용 여부는 관리자에게 숨김
  async getApplications(eventId: string) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const applications = await (this.prisma as any).eventApplication.findMany({
      where: { eventId },
      include: { user: true },
      orderBy: { applicationOrder: 'asc' },
    });

    return (applications as any[]).map((app) => ({
      id: app.id as string,
      userId: app.userId as string,
      username: app.user.username as string,
      discordId: app.user.discordId as string,
      applicationOrder: app.applicationOrder as number,
      // 코인 사용자(COIN_GUARANTEED)도 PENDING으로 표시하여 숨김
      status:
        (app.status as string) === 'COIN_GUARANTEED'
          ? 'PENDING'
          : (app.status as string),
      libraryMessageCount: app.libraryMessageCount as number,
      createdAt: app.createdAt as Date,
      isTerras: app.user.isTerras as boolean,
      isNewMember: app.isNewMember as boolean, // 신청 시점의 뉴멤버 여부
    }));
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // 결제 완료 처리
  async confirmPayment(
    userId: string,
    eventId: string,
  ): Promise<{ success: boolean; message: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const application = await (this.prisma as any).eventApplication.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!application) {
      throw new BadRequestException('신청 내역을 찾을 수 없습니다.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).eventApplication.update({
      where: {
        eventId_userId: { eventId, userId },
      },
      data: {
        status: 'CONFIRMED',
        paidAt: new Date(),
      },
    });

    return {
      success: true,
      message: '결제가 완료되었습니다.',
    };
  }

  // 신청 취소
  async cancelApplication(
    userId: string,
    eventId: string,
  ): Promise<{ success: boolean; message: string; refundedCoins: number }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const application = await (this.prisma as any).eventApplication.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!application) {
      throw new BadRequestException('신청 내역을 찾을 수 없습니다.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const usedCoins = application.usedCoins as number;

    // 코인 환불
    if (usedCoins > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
          coins: { increment: usedCoins },
        },
      });
    }

    // 신청 삭제
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).eventApplication.delete({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    // 참가자 수는 applications 배열 길이로 자동 계산되므로 별도 업데이트 불필요

    return {
      success: true,
      message:
        usedCoins > 0
          ? `신청이 취소되었습니다. 코인 ${usedCoins}개가 환불되었습니다.`
          : '신청이 취소되었습니다.',
      refundedCoins: usedCoins,
    };
  }

  // Discord DM 전송 (결제 안내 또는 코인 반환 알림)
  async sendDiscordDM(
    discordId: string,
    content: {
      title: string;
      description: string;
      color?: number;
      fields?: { name: string; value: string; inline?: boolean }[];
      url?: string;
    },
  ): Promise<boolean> {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.warn('Discord bot token not configured for DM');
      return false;
    }

    try {
      // DM 채널 생성
      const dmChannelRes = await fetch(
        'https://discord.com/api/v10/users/@me/channels',
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recipient_id: discordId }),
        },
      );

      if (!dmChannelRes.ok) {
        console.error(
          'Failed to create DM channel:',
          await dmChannelRes.text(),
        );
        return false;
      }

      const dmChannel = (await dmChannelRes.json()) as DiscordDMChannel;

      // 임베드 메시지 전송
      const messageRes = await fetch(
        `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            embeds: [
              {
                title: content.title,
                description: content.description,
                color: content.color ?? 0x7c9070, // 세이지 그린
                fields: content.fields ?? [],
                url: content.url,
                timestamp: new Date().toISOString(),
                footer: {
                  text: '부기북스 | 링크를 클릭하면 결제창이 열립니다',
                  icon_url: `${process.env.FRONTEND_URL || 'https://boogibooks.com'}/logo.png`,
                },
              },
            ],
          }),
        },
      );

      if (!messageRes.ok) {
        console.error('Failed to send DM:', await messageRes.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending Discord DM:', error);
      return false;
    }
  }

  // 승인 후 결제 DM 전송
  async sendPaymentDM(
    discordId: string,
    userId: string,
    eventId: string,
    eventTitle: string,
    price: number,
    applicationOrder: number,
    isCoinRefunded: boolean = false,
    refundedCoins: number = 0,
  ) {
    let description = `**${eventTitle}** 모임 신청이 승인되었습니다!\n\n`;

    if (isCoinRefunded && refundedCoins > 0) {
      description += `🎉 **축하합니다!** 이달의 멤버로 선정되어 코인 ${refundedCoins}개가 반환되었습니다.\n\n`;
    }

    description += `아래 계좌로 ${price.toLocaleString()}원을 입금해주세요.\n입금 후 자동으로 확정됩니다.`;

    const fields = [
      {
        name: '💰 결제 금액',
        value: `${price.toLocaleString()}원`,
        inline: true,
      },
      {
        name: '🏦 입금 계좌',
        value: 'KB국민은행 943202-00-285775\n예금주: 송대석',
        inline: true,
      },
    ];

    if (isCoinRefunded && refundedCoins > 0) {
      fields.push({
        name: '🪙 코인 반환',
        value: `${refundedCoins}개 반환됨`,
        inline: true,
      });
    }

    return this.sendDiscordDM(discordId, {
      title: '📬 모임 신청 승인 안내',
      description,
      color: isCoinRefunded ? 0xffd700 : 0x7c9070, // 코인 반환 시 골드 색상
      fields,
      url: `${process.env.FRONTEND_URL || 'https://boogibooks.com'}/payment?eventId=${eventId}&applicationOrder=${applicationOrder}&userId=${userId}`,
    });
  }
}
