import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Body,
  UnauthorizedException,
  Query,
} from '@nestjs/common';

import { BoogiOutService } from './boogi-out.service';

/** /boogi-out/:id 와 경로 충돌을 피하기 위해 별도 prefix */
@Controller('boogi-out-bot')
export class BoogiOutBotController {
  constructor(private readonly boogiOutService: BoogiOutService) {}

  private assertSecret(secret: string | undefined) {
    const expected = process.env.BOT_INTERNAL_SECRET;
    if (!expected || secret !== expected) {
      console.log('assertSecret', expected, 'but', secret);
      throw new UnauthorizedException('Invalid bot secret');
    }
  }

  @Get('outbox')
  listOutbox(
    @Headers('x-bot-secret') secret: string,
    @Query('limit') limit?: string,
  ) {
    this.assertSecret(secret);
    const n = Math.min(parseInt(limit || '20', 10) || 20, 100);
    return this.boogiOutService.listPendingOutbox(n);
  }

  @Post('outbox/:id/ack')
  ack(
    @Headers('x-bot-secret') secret: string,
    @Param('id') id: string,
    @Body() body: { success: boolean; error?: string },
  ) {
    this.assertSecret(secret);
    return this.boogiOutService.ackOutbox(id, body);
  }
}
