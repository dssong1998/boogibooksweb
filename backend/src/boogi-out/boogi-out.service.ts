import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Express } from 'express';
import {
  BoogiOutApplicationStatus,
  BoogiOutCostMode,
  BoogiOutEventStatus,
  BoogiOutTimeMode,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoogiOutDto } from './dto/create-boogi-out.dto';
import { ApplyBoogiOutDto } from './dto/apply-boogi-out.dto';
import { ConfirmBoogiOutDateDto } from './dto/confirm-date.dto';
import { AfterPartySettleDto } from './dto/after-party.dto';
import { computeBoogiOutSchedule } from './boogi-out-schedule';
import {
  perPersonFromPerPersonBase,
  perPersonFromTotalCost,
  perPersonIfTenApplicantsTotalMode,
} from './boogi-out-pricing';
import { ObjectStorageService } from '../object-storage/object-storage.service';

@Injectable()
export class BoogiOutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  private getFrontendBase(): string {
    return (
      process.env.FRONTEND_URL ||
      process.env.FRONTEND_BASE_URL ||
      'http://localhost:5173'
    );
  }

  private async assertMember(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.role === UserRole.VISITOR) {
      throw new ForbiddenException('부기 멤버만 이용할 수 있습니다.');
    }
  }

  async calculatePreview(input: {
    costMode: BoogiOutCostMode;
    costAmount: number;
    feePercent?: number;
    participantCount: number;
  }) {
    const fee = input.feePercent ?? 10;
    const n = Math.max(1, input.participantCount);
    if (input.costMode === BoogiOutCostMode.TOTAL) {
      return {
        feePercent: fee,
        perPerson: perPersonFromTotalCost(input.costAmount, fee, n),
        perPersonIfTenApplicants: perPersonIfTenApplicantsTotalMode(
          input.costAmount,
          fee,
        ),
        totalWithFee: Math.round(input.costAmount * (1 + fee / 100)),
      };
    }
    return {
      feePercent: fee,
      perPerson: perPersonFromPerPersonBase(input.costAmount, fee),
      perPersonIfTenApplicants: perPersonFromPerPersonBase(
        input.costAmount,
        fee,
      ),
      totalWithFee: Math.round(
        perPersonFromPerPersonBase(input.costAmount, fee) * n,
      ),
    };
  }

  async create(userId: string, dto: CreateBoogiOutDto) {
    await this.assertMember(userId);

    if (dto.applicantResponseEnabled && !dto.applicantResponseLabel?.trim()) {
      throw new BadRequestException(
        '신청자 응답을 사용할 때는 질문 문구를 입력해야 합니다.',
      );
    }

    if (dto.afterPartyEnabled && dto.afterPartyBudgetPerPerson == null) {
      throw new BadRequestException(
        '뒷풀이가 있을 때는 1인당 예상 예산을 입력해야 합니다.',
      );
    }

    let status: BoogiOutEventStatus = BoogiOutEventStatus.STANDBY;
    let eventDate: Date | null = null;
    let reminder3dAt: Date | null = null;
    let registrationClosesAt: Date | null = null;

    if (dto.timeMode === BoogiOutTimeMode.CONFIRMED) {
      if (!dto.eventDate) {
        throw new BadRequestException('확정 일정은 개최 일시가 필요합니다.');
      }
      eventDate = new Date(dto.eventDate);
      if (Number.isNaN(eventDate.getTime())) {
        throw new BadRequestException('유효하지 않은 개최 일시입니다.');
      }
      status = BoogiOutEventStatus.IN_PROGRESS;
      const s = computeBoogiOutSchedule(eventDate);
      reminder3dAt = s.reminder3dAt;
      registrationClosesAt = s.registrationClosesAt;
    }

    const feePercent = 10;

    if (
      dto.settlementMode === 'COMMISSION' &&
      (!dto.commissionBankName?.trim() ||
        !dto.commissionAccountNumber?.trim())
    ) {
      throw new BadRequestException(
        '현금성 정산을 선택한 경우 은행명과 계좌번호를 입력해야 합니다.',
      );
    }

    const event = await this.prisma.boogiOutEvent.create({
      data: {
        creatorId: userId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        location: dto.location.trim(),
        costMode: dto.costMode,
        costAmount: dto.costAmount,
        feePercent,
        settlementMode: dto.settlementMode,
        demandParticipants: dto.demandParticipants,
        commissionBankName:
          dto.settlementMode === 'COMMISSION'
            ? dto.commissionBankName!.trim()
            : null,
        commissionAccountNumber:
          dto.settlementMode === 'COMMISSION'
            ? dto.commissionAccountNumber!.trim()
            : null,
        maxParticipants: dto.maxParticipants ?? null,
        timeMode: dto.timeMode,
        eventDate,
        targetHeadcount: dto.targetHeadcount ?? null,
        dateSelectionMockupUrl: dto.dateSelectionMockupUrl?.trim() || null,
        applicantResponseEnabled: dto.applicantResponseEnabled,
        applicantResponseLabel: dto.applicantResponseLabel?.trim() || null,
        afterPartyEnabled: dto.afterPartyEnabled,
        afterPartyBudgetPerPerson: dto.afterPartyBudgetPerPerson ?? null,
        promotionalImageUrl: dto.promotionalImageUrl?.trim() || null,
        status,
        reminder3dAt,
        registrationClosesAt,
      },
    });

    await this.prisma.boogiOutApplication.create({
      data: {
        eventId: event.id,
        userId,
        responseText: dto.applicantResponseEnabled
          ? '기획자 자동 신청'
          : null,
        afterPartyOptIn: dto.afterPartyEnabled ? true : null,
        status: BoogiOutApplicationStatus.PENDING,
      },
    });

    await this.tryNotifyStandbyHeadcount(event.id);

    const creator = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    await this.prisma.boogiOutDiscordOutbox.create({
      data: {
        kind: 'CREATE_PROMO',
        eventId: event.id,
        payload: {
          eventId: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          promotionalImageUrl: event.promotionalImageUrl,
          eventDate: event.eventDate?.toISOString() ?? null,
          status: event.status,
          timeMode: event.timeMode,
          targetHeadcount: event.targetHeadcount,
          creatorDiscordId: creator?.discordId ?? null,
          frontendUrl: this.getFrontendBase(),
        },
      },
    });

    return event;
  }

  findAll() {
    return this.prisma.boogiOutEvent.findMany({
      where: {
        status: {
          in: [
            BoogiOutEventStatus.STANDBY,
            BoogiOutEventStatus.IN_PROGRESS,
            BoogiOutEventStatus.CLOSED_REGISTRATION,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true } },
        _count: { select: { applications: true } },
      },
    });
  }

  /** 일반 신청자용: 수요 인원(demandParticipants) 기준 참고 예상(수수료 미포함, 안내용) */
  computeExpectedPrice(ev: {
    costMode: BoogiOutCostMode;
    costAmount: number;
    demandParticipants: number;
  }): number {
    const n = Math.max(1, ev.demandParticipants);
    if (ev.costMode === BoogiOutCostMode.TOTAL) {
      return Math.round(ev.costAmount / n);
    }
    return Math.round(ev.costAmount);
  }

  /**
   * 기획자용: 현재 신청 인원(취소 제외)으로 총액을 나눈 1인 부담(수수료 포함).
   * 총액 모드: (총비용+수수료)/n, 1인당 모드: 1인 기준 금액+수수료(n 무관).
   */
  computePlannerPerPersonByActualHeadcount(
    ev: {
      costMode: BoogiOutCostMode;
      costAmount: number;
      feePercent: number;
    },
    activeApplicantCount: number,
  ): number {
    const n = Math.max(1, activeApplicantCount);
    if (ev.costMode === BoogiOutCostMode.TOTAL) {
      return perPersonFromTotalCost(ev.costAmount, ev.feePercent, n);
    }
    return perPersonFromPerPersonBase(ev.costAmount, ev.feePercent);
  }

  async findOneForViewer(id: string, viewerUserId: string | null) {
    const event = await this.prisma.boogiOutEvent.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    const demandBasedExpected = this.computeExpectedPrice({
      costMode: event.costMode,
      costAmount: event.costAmount,
      demandParticipants: event.demandParticipants,
    });

    const activeApplicantCount = await this.prisma.boogiOutApplication.count({
      where: {
        eventId: id,
        status: { not: BoogiOutApplicationStatus.CANCELLED },
      },
    });

    let viewerIsPlanner = false;
    if (viewerUserId) {
      const viewer = await this.prisma.user.findUnique({
        where: { id: viewerUserId },
        select: { id: true, role: true },
      });
      if (viewer) {
        viewerIsPlanner =
          viewer.id === event.creatorId || viewer.role === UserRole.ADMIN;
      }
    }

    if (viewerIsPlanner) {
      const expectedPrice = this.computePlannerPerPersonByActualHeadcount(
        {
          costMode: event.costMode,
          costAmount: event.costAmount,
          feePercent: event.feePercent,
        },
        activeApplicantCount,
      );
      return {
        ...event,
        expectedPrice,
        viewerIsPlanner: true,
        activeApplicantCount,
      };
    }

    const {
      costMode: _cm,
      costAmount: _ca,
      feePercent: _fp,
      settlementMode: _sm,
      commissionBankName: _cb,
      commissionAccountNumber: _cc,
      paymentLink: _pl,
      ...publicEvent
    } = event;

    return {
      ...publicEvent,
      expectedPrice: demandBasedExpected,
      viewerIsPlanner: false,
    };
  }

  async findProofPage(eventId: string, proofToken: string) {
    const app = await this.prisma.boogiOutApplication.findFirst({
      where: { eventId, proofToken },
      include: {
        event: { select: { title: true, location: true, eventDate: true } },
        user: { select: { username: true } },
      },
    });
    if (!app) throw new NotFoundException('찾을 수 없습니다.');
    if (app.status !== BoogiOutApplicationStatus.PAID) {
      throw new ForbiddenException('결제 완료 후 확인할 수 있습니다.');
    }
    return {
      eventTitle: app.event.title,
      location: app.event.location,
      eventDate: app.event.eventDate,
      username: app.user.username,
      paidAt: app.paidAt,
    };
  }

  async apply(eventId: string, userId: string, dto: ApplyBoogiOutDto) {
    await this.assertMember(userId);

    const event = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    if (
      event.status === BoogiOutEventStatus.CANCELLED ||
      event.status === BoogiOutEventStatus.COMPLETED
    ) {
      throw new BadRequestException('신청할 수 없는 이벤트입니다.');
    }

    if (event.status === BoogiOutEventStatus.CLOSED_REGISTRATION) {
      throw new BadRequestException('신청이 마감되었습니다.');
    }

    if (event.status === BoogiOutEventStatus.IN_PROGRESS) {
      if (
        event.registrationClosesAt &&
        new Date() >= event.registrationClosesAt
      ) {
        throw new BadRequestException('신청이 마감되었습니다.');
      }
    }

    const activeApplicationCount = await this.prisma.boogiOutApplication.count({
      where: {
        eventId,
        status: { not: BoogiOutApplicationStatus.CANCELLED },
      },
    });
    if (
      event.maxParticipants != null &&
      activeApplicationCount >= event.maxParticipants
    ) {
      throw new BadRequestException('정원이 마감되었습니다.');
    }

    if (event.applicantResponseEnabled) {
      if (!dto.responseText?.trim()) {
        throw new BadRequestException('신청자 응답을 입력해주세요.');
      }
    }

    if (event.afterPartyEnabled) {
      if (typeof dto.afterPartyOptIn !== 'boolean') {
        throw new BadRequestException('뒷풀이 참여 여부를 선택해주세요.');
      }
    }

    const existingApp = await this.prisma.boogiOutApplication.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    let app: { id: string; responseText: string | null };

    if (existingApp) {
      if (existingApp.status !== BoogiOutApplicationStatus.CANCELLED) {
        throw new BadRequestException('이미 신청한 이벤트입니다.');
      }
      app = await this.prisma.boogiOutApplication.update({
        where: { id: existingApp.id },
        data: {
          responseText: dto.responseText?.trim() || null,
          afterPartyOptIn: event.afterPartyEnabled ? dto.afterPartyOptIn! : null,
          status: BoogiOutApplicationStatus.PENDING,
          proofToken: randomUUID(),
        },
        select: { id: true, responseText: true },
      });
    } else {
      app = await this.prisma.boogiOutApplication.create({
        data: {
          eventId,
          userId,
          responseText: dto.responseText?.trim() || null,
          afterPartyOptIn: event.afterPartyEnabled ? dto.afterPartyOptIn! : null,
          status: BoogiOutApplicationStatus.PENDING,
        },
        select: { id: true, responseText: true },
      });
    }

    const applicant = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const planner = await this.prisma.user.findUnique({
      where: { id: event.creatorId },
    });

    await this.prisma.boogiOutDiscordOutbox.create({
      data: {
        kind: 'NEW_APPLICATION_PLANNER_DM',
        eventId: event.id,
        payload: {
          plannerDiscordId: planner?.discordId,
          applicantUsername: applicant?.username,
          applicantDiscordId: applicant?.discordId,
          responseText: app.responseText,
          eventTitle: event.title,
          eventId: event.id,
          afterPartyEnabled: event.afterPartyEnabled,
          afterPartyOptIn: event.afterPartyEnabled ? dto.afterPartyOptIn! : null,
          afterPartyBudgetPerPerson: event.afterPartyBudgetPerPerson,
        },
      },
    });

    await this.tryNotifyStandbyHeadcount(eventId);

    return this.prisma.boogiOutApplication.findUniqueOrThrow({
      where: { id: app.id },
    });
  }

  /** 함께 설정 + 목표 인원 달성 시 기획자에게 날짜 조율 DM (1회) */
  private async tryNotifyStandbyHeadcount(eventId: string): Promise<void> {
    const ev = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!ev) return;
    const count = await this.prisma.boogiOutApplication.count({
      where: {
        eventId,
        status: { not: BoogiOutApplicationStatus.CANCELLED },
      },
    });
    if (
      ev.timeMode !== BoogiOutTimeMode.SET_TOGETHER ||
      ev.targetHeadcount == null ||
      count < ev.targetHeadcount ||
      ev.headcountReachedNotifiedAt
    ) {
      return;
    }
    const planner = await this.prisma.user.findUnique({
      where: { id: ev.creatorId },
      select: { discordId: true },
    });
    await this.prisma.boogiOutEvent.update({
      where: { id: eventId },
      data: { headcountReachedNotifiedAt: new Date() },
    });
    await this.prisma.boogiOutDiscordOutbox.create({
      data: {
        kind: 'STANDBY_HEADCOUNT_MET',
        eventId: ev.id,
        payload: {
          plannerDiscordId: planner?.discordId,
          mockupUrl:
            ev.dateSelectionMockupUrl ||
            `${this.getFrontendBase()}/boogi-out/${ev.id}/schedule`,
          eventTitle: ev.title,
        },
      },
    });
  }

  async confirmDate(eventId: string, userId: string, dto: ConfirmBoogiOutDateDto) {
    await this.assertMember(userId);

    const event = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    if (event.creatorId !== userId) {
      throw new ForbiddenException('기획자만 일정을 확정할 수 있습니다.');
    }
    if (event.timeMode !== BoogiOutTimeMode.SET_TOGETHER) {
      throw new BadRequestException('함께 설정 일정만 확정할 수 있습니다.');
    }
    if (event.status !== BoogiOutEventStatus.STANDBY) {
      throw new BadRequestException('이미 일정이 확정되었거나 종료되었습니다.');
    }

    const eventDate = new Date(dto.eventDate);
    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException('유효하지 않은 개최 일시입니다.');
    }
    const s = computeBoogiOutSchedule(eventDate);

    return this.prisma.boogiOutEvent.update({
      where: { id: eventId },
      data: {
        eventDate,
        status: BoogiOutEventStatus.IN_PROGRESS,
        reminder3dAt: s.reminder3dAt,
        registrationClosesAt: s.registrationClosesAt,
      },
    });
  }

  async settleAfterParty(
    eventId: string,
    userId: string,
    dto: AfterPartySettleDto,
  ) {
    await this.assertMember(userId);

    const event = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    if (event.creatorId !== userId) {
      throw new ForbiddenException('기획자만 정산할 수 있습니다.');
    }
    if (!event.afterPartyEnabled) {
      throw new BadRequestException('뒷풀이가 설정되지 않은 이벤트입니다.');
    }

    const paid = await this.prisma.boogiOutApplication.findMany({
      where: {
        eventId,
        status: BoogiOutApplicationStatus.PAID,
        afterPartyOptIn: true,
      },
      include: { user: true },
    });
    if (paid.length === 0) {
      throw new BadRequestException(
        '뒷풀이 참여로 신청한 결제 완료 인원이 없습니다.',
      );
    }

    const each = Math.round(dto.totalAmount / paid.length);

    await this.prisma.boogiOutEvent.update({
      where: { id: eventId },
      data: {
        afterPartyTotalAmount: dto.totalAmount,
        afterPartyBankName: dto.bankName.trim(),
        afterPartyAccountNumber: dto.accountNumber.trim(),
        afterPartySettledAt: new Date(),
      },
    });

    await this.prisma.boogiOutDiscordOutbox.create({
      data: {
        kind: 'AFTER_PARTY_SPLIT',
        eventId,
        payload: {
          eventTitle: event.title,
          totalAmount: dto.totalAmount,
          each,
          bankName: dto.bankName.trim(),
          accountNumber: dto.accountNumber.trim(),
          userDiscordIds: paid
            .map((p) => p.user.discordId)
            .filter((id): id is string => Boolean(id)),
        },
      },
    });

    return { each, recipientCount: paid.length };
  }

  async confirmPayment(eventId: string, userId: string) {
    await this.assertMember(userId);

    const app = await this.prisma.boogiOutApplication.findFirst({
      where: { eventId, userId },
    });
    if (!app) throw new NotFoundException('신청 내역이 없습니다.');
    if (app.status !== BoogiOutApplicationStatus.AWAITING_PAYMENT) {
      throw new BadRequestException('결제 대기 상태가 아닙니다.');
    }

    return this.prisma.boogiOutApplication.update({
      where: { id: app.id },
      data: {
        status: BoogiOutApplicationStatus.PAID,
        paidAt: new Date(),
      },
    });
  }

  async getMyApplication(eventId: string, userId: string) {
    await this.assertMember(userId);
    return this.prisma.boogiOutApplication.findFirst({
      where: { eventId, userId },
    });
  }

  /** 결제 완료(PAID) 참가 건만 — 증명 페이지 모음용 */
  async listMyCertificates(userId: string) {
    await this.assertMember(userId);
    const apps = await this.prisma.boogiOutApplication.findMany({
      where: {
        userId,
        status: BoogiOutApplicationStatus.PAID,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            location: true,
            eventDate: true,
            status: true,
          },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
    return apps.map((a) => ({
      eventId: a.event.id,
      eventTitle: a.event.title,
      location: a.event.location,
      eventDate: a.event.eventDate?.toISOString() ?? null,
      proofToken: a.proofToken,
      paidAt: a.paidAt?.toISOString() ?? null,
      eventStatus: a.event.status,
    }));
  }

  async listApplicationsForPlanner(eventId: string, userId: string) {
    await this.assertMember(userId);
    const event = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (event.creatorId !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('기획자 또는 관리자만 조회할 수 있습니다.');
    }
    return this.prisma.boogiOutApplication.findMany({
      where: { eventId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async closeRegistrations(eventId: string, userId: string) {
    await this.assertMember(userId);
    const event = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (event.creatorId !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('기획자 또는 관리자만 마감할 수 있습니다.');
    }
    if (
      event.status === BoogiOutEventStatus.CLOSED_REGISTRATION ||
      event.status === BoogiOutEventStatus.COMPLETED ||
      event.status === BoogiOutEventStatus.CANCELLED
    ) {
      throw new BadRequestException('이미 마감되었거나 종료된 이벤트입니다.');
    }
    if (event.registrationClosedAt) {
      throw new BadRequestException('이미 신청이 마감되었습니다.');
    }
    await this.performRegistrationClose(eventId);
    return this.findOneForViewer(eventId, userId);
  }

  async cancelMyApplication(eventId: string, userId: string) {
    await this.assertMember(userId);
    const app = await this.prisma.boogiOutApplication.findFirst({
      where: { eventId, userId },
    });
    if (!app) throw new NotFoundException('신청 내역이 없습니다.');
    if (
      app.status !== BoogiOutApplicationStatus.PENDING &&
      app.status !== BoogiOutApplicationStatus.AWAITING_PAYMENT
    ) {
      throw new BadRequestException('취소할 수 없는 상태입니다.');
    }
    return this.prisma.boogiOutApplication.update({
      where: { id: app.id },
      data: { status: BoogiOutApplicationStatus.CANCELLED },
    });
  }

  /** 스케줄러·수동 마감 공통: 신청 마감 처리 및 DM·스레드 아웃박스 */
  private async performRegistrationClose(eventId: string): Promise<void> {
    const now = new Date();
    const existing = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!existing || existing.registrationClosedAt) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.boogiOutEvent.update({
        where: { id: eventId },
        data: {
          registrationClosedAt: now,
          status: BoogiOutEventStatus.CLOSED_REGISTRATION,
        },
      });
      await tx.boogiOutApplication.updateMany({
        where: {
          eventId,
          status: BoogiOutApplicationStatus.PENDING,
        },
        data: { status: BoogiOutApplicationStatus.AWAITING_PAYMENT },
      });
    });

    const fresh = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!fresh) return;

    const apps = await this.prisma.boogiOutApplication.findMany({
      where: {
        eventId,
        status: BoogiOutApplicationStatus.AWAITING_PAYMENT,
      },
      include: { user: true },
    });

    const fee = fresh.feePercent;
    const n = Math.max(apps.length, 1);
    let perPerson = 0;
    if (fresh.costMode === BoogiOutCostMode.TOTAL) {
      perPerson = perPersonFromTotalCost(fresh.costAmount, fee, n);
    } else {
      perPerson = perPersonFromPerPersonBase(fresh.costAmount, fee);
    }

    const paymentUrl =
      fresh.paymentLink?.trim() ||
      `${this.getFrontendBase()}/payment?eventId=${encodeURIComponent(fresh.id)}&paymentKind=BOOGI_OUT&amount=${perPerson}`;

    for (const a of apps) {
      const proofUrl = `${this.getFrontendBase()}/boogi-out/${fresh.id}/proof/${a.proofToken}`;
      await this.prisma.boogiOutDiscordOutbox.create({
        data: {
          kind: 'POST_CLOSE_DM',
          eventId: fresh.id,
          payload: {
            userDiscordId: a.user.discordId,
            eventTitle: fresh.title,
            location: fresh.location,
            eventDate: fresh.eventDate?.toISOString(),
            perPerson,
            settlementMode: fresh.settlementMode,
            afterPartyEnabled: fresh.afterPartyEnabled,
            afterPartyOptIn: a.afterPartyOptIn,
            afterPartyBudgetPerPerson: fresh.afterPartyBudgetPerPerson,
            paymentUrl,
            proofUrl,
            commissionBankName: fresh.commissionBankName,
            commissionAccountNumber: fresh.commissionAccountNumber,
          },
        },
      });
    }

    await this.prisma.boogiOutEvent.update({
      where: { id: eventId },
      data: { postCloseDmSentAt: now },
    });

    const mentionIds = apps.map((x) => x.user.discordId).filter(Boolean);
    await this.prisma.boogiOutDiscordOutbox.create({
      data: {
        kind: 'CREATE_ATTENDANCE_THREAD',
        eventId: fresh.id,
        payload: {
          eventId: fresh.id,
          title: `[부깃아웃] ${fresh.title}`,
          mentionDiscordIds: mentionIds,
        },
      },
    });
  }

  /** 홍보 이미지 업로드 → Vultr Object Storage 공개 URL (기획 등록 시 promotionalImageUrl에 넣음) */
  async uploadPromotionalImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    await this.assertMember(userId);
    if (!this.objectStorage.isConfigured()) {
      throw new ServiceUnavailableException(
        '이미지 저장소(Vultr Object Storage)가 설정되지 않았습니다.',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('파일이 필요합니다.');
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        'JPG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.',
      );
    }
    const url = await this.objectStorage.uploadPublicImage({
      buffer: file.buffer,
      contentType: file.mimetype,
      originalName: file.originalname,
      folder: 'boogi-out/promo',
    });
    return { url };
  }

  async processScheduledRemindersAndCloses() {
    const now = new Date();

    const reminderEvents = await this.prisma.boogiOutEvent.findMany({
      where: {
        status: BoogiOutEventStatus.IN_PROGRESS,
        reminder3dAt: { lte: now },
        reminder3dSentAt: null,
      },
    });

    for (const ev of reminderEvents) {
      await this.prisma.boogiOutEvent.update({
        where: { id: ev.id },
        data: { reminder3dSentAt: now },
      });
      await this.prisma.boogiOutDiscordOutbox.create({
        data: {
          kind: 'REMINDER_3D_CHANNEL',
          eventId: ev.id,
          payload: {
            eventId: ev.id,
            title: ev.title,
            eventDate: ev.eventDate?.toISOString(),
            location: ev.location,
            description: ev.description,
            frontendUrl: this.getFrontendBase(),
          },
        },
      });
    }

    const closeEvents = await this.prisma.boogiOutEvent.findMany({
      where: {
        status: BoogiOutEventStatus.IN_PROGRESS,
        registrationClosesAt: { lte: now },
        registrationClosedAt: null,
      },
    });

    for (const ev of closeEvents) {
      await this.performRegistrationClose(ev.id);
    }
  }

  async listPendingOutbox(limit: number) {
    return this.prisma.boogiOutDiscordOutbox.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async ackOutbox(
    id: string,
    body: { success: boolean; error?: string },
  ): Promise<void> {
    await this.prisma.boogiOutDiscordOutbox.update({
      where: { id },
      data: {
        status: body.success ? 'DONE' : 'FAILED',
        error: body.error ?? null,
        processedAt: new Date(),
      },
    });
  }
}
