import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BoogiOutApplicationStatus,
  BoogiOutCostMode,
  EventApplicationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  perPersonFromPerPersonBase,
  perPersonFromTotalCost,
} from '../boogi-out/boogi-out-pricing';

export type PaymentKindDto = 'EVENT' | 'BOOGI_OUT';

export interface PaymentTargetDto {
  paymentKind: PaymentKindDto;
  title: string;
  amount: number;
  eventType?: string;
  settlementMode?: string;
  commissionBankName?: string | null;
  commissionAccountNumber?: string | null;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentTarget(
    eventId: string,
    paymentKind: PaymentKindDto,
    userId: string,
  ): Promise<PaymentTargetDto> {
    if (paymentKind === 'EVENT') {
      return this.getEventTarget(eventId, userId);
    }
    return this.getBoogiOutTarget(eventId, userId);
  }

  private async getEventTarget(
    eventId: string,
    userId: string,
  ): Promise<PaymentTargetDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    const app = await this.prisma.eventApplication.findFirst({
      where: {
        eventId,
        userId,
        status: EventApplicationStatus.APPROVED,
      },
    });
    if (!app) {
      throw new ForbiddenException('결제 대기 중인 신청이 없습니다.');
    }

    return {
      paymentKind: 'EVENT',
      title: event.title,
      amount: event.price,
      eventType: event.eventType,
    };
  }

  private async getBoogiOutTarget(
    eventId: string,
    userId: string,
  ): Promise<PaymentTargetDto> {
    const ev = await this.prisma.boogiOutEvent.findUnique({
      where: { id: eventId },
    });
    if (!ev) throw new NotFoundException('부깃아웃을 찾을 수 없습니다.');

    const app = await this.prisma.boogiOutApplication.findFirst({
      where: { eventId, userId },
    });
    if (!app) throw new ForbiddenException('신청 내역이 없습니다.');
    if (app.status === BoogiOutApplicationStatus.PAID) {
      throw new BadRequestException('이미 결제 완료 처리되었습니다.');
    }
    if (app.status !== BoogiOutApplicationStatus.AWAITING_PAYMENT) {
      throw new ForbiddenException('결제 대기 상태가 아닙니다.');
    }

    const n = await this.prisma.boogiOutApplication.count({
      where: {
        eventId,
        status: {
          in: [
            BoogiOutApplicationStatus.AWAITING_PAYMENT,
            BoogiOutApplicationStatus.PAID,
          ],
        },
      },
    });
    const count = Math.max(n, 1);
    let amount: number;
    if (ev.costMode === BoogiOutCostMode.TOTAL) {
      amount = perPersonFromTotalCost(ev.costAmount, ev.feePercent, count);
    } else {
      amount = perPersonFromPerPersonBase(ev.costAmount, ev.feePercent);
    }

    return {
      paymentKind: 'BOOGI_OUT',
      title: ev.title,
      amount,
      settlementMode: ev.settlementMode,
      commissionBankName: ev.commissionBankName,
      commissionAccountNumber: ev.commissionAccountNumber,
    };
  }
}
