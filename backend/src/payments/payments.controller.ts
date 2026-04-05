import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  PaymentsService,
  type PaymentKindDto,
} from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly authService: AuthService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('target')
  target(
    @Headers('Authorization') authHeader: string | undefined,
    @Query('eventId') eventId: string,
    @Query('paymentKind') paymentKind: string,
  ) {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('로그인이 필요합니다.');
    if (!eventId?.trim()) {
      throw new BadRequestException('eventId가 필요합니다.');
    }
    const kind = paymentKind?.trim().toUpperCase();
    if (kind !== 'EVENT' && kind !== 'BOOGI_OUT') {
      throw new BadRequestException(
        'paymentKind은 EVENT 또는 BOOGI_OUT 이어야 합니다.',
      );
    }
    return this.paymentsService.getPaymentTarget(
      eventId,
      kind as PaymentKindDto,
      userId,
    );
  }
}
