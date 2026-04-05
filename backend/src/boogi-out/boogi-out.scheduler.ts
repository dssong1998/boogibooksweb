import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BoogiOutService } from './boogi-out.service';

@Injectable()
export class BoogiOutScheduler {
  private readonly logger = new Logger(BoogiOutScheduler.name);

  constructor(private readonly boogiOutService: BoogiOutService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    try {
      await this.boogiOutService.processScheduledRemindersAndCloses();
    } catch (e) {
      this.logger.error(
        `BoogiOut scheduled tasks failed: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
