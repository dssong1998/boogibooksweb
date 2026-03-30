import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AuthModule } from '../auth/auth.module';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [AuthModule, LibraryModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
