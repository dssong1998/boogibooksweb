import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AuthModule } from '../auth/auth.module';
import { LibraryModule } from '../library/library.module';
import { DiscordDmModule } from '../discord-dm/discord-dm.module';

@Module({
  imports: [AuthModule, LibraryModule, DiscordDmModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
