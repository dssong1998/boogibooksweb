import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RecordLibraryActivityDto } from './dto/record-library-activity.dto';
import { LibraryActivityService } from './library-activity.service';

@Controller('library-activity')
export class LibraryActivityController {
  constructor(private readonly libraryActivityService: LibraryActivityService) {}

  /**
   * 디스코드 봇 전용 — 서재 포럼 활동 실시간 반영
   * 헤더: x-bot-secret (BOT_INTERNAL_SECRET)
   */
  @Post('bot')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  recordFromBot(
    @Headers('x-bot-secret') secret: string | undefined,
    @Body() body: RecordLibraryActivityDto,
  ) {
    const expected = process.env.BOT_INTERNAL_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid bot secret');
    }
    return this.libraryActivityService.recordBotSignal({
      discordUserId: body.discordUserId,
      sourceId: body.sourceId,
      kind: body.kind,
      occurredAt: body.occurredAt,
    });
  }
}
