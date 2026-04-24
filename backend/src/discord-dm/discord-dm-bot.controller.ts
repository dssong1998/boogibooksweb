import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { DiscordDmOutboxService } from './discord-dm-outbox.service';

/** BoogiOut `/boogi-out-bot` 과 동일하게 봇 전용 시크릿으로 보호 */
@Controller('discord-dm-bot')
export class DiscordDmBotController {
  constructor(private readonly discordDmOutbox: DiscordDmOutboxService) {}

  private assertSecret(secret: string | undefined) {
    const expected = process.env.BOT_INTERNAL_SECRET;
    if (!expected || secret !== expected) {
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
    return this.discordDmOutbox.listPending(n);
  }

  @Post('outbox/:id/ack')
  ack(
    @Headers('x-bot-secret') secret: string,
    @Param('id') id: string,
    @Body() body: { success: boolean; error?: string },
  ) {
    this.assertSecret(secret);
    return this.discordDmOutbox.ackOutbox(id, body);
  }
}
