import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordDmOutboxService } from './discord-dm-outbox.service';
import { DiscordDmBotController } from './discord-dm-bot.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DiscordDmBotController],
  providers: [DiscordDmOutboxService],
  exports: [DiscordDmOutboxService],
})
export class DiscordDmModule {}
