import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoomsService } from './rooms.service';

@Injectable()
export class RoomsScheduler {
  private readonly logger = new Logger(RoomsScheduler.name);

  constructor(private readonly roomsService: RoomsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tickCaptainDiscord() {
    try {
      await this.roomsService.processCaptainDiscordScheduled();
    } catch (e) {
      this.logger.error(
        `Rooms captain Discord schedule failed: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
