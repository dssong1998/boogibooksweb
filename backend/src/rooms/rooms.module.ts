import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DiscordDmModule } from '../discord-dm/discord-dm.module';
import { RoomsAdminController } from './rooms-admin.controller';
import { RoomsController } from './rooms.controller';
import { RoomsScheduler } from './rooms.scheduler';
import { RoomsService } from './rooms.service';

@Module({
  imports: [PrismaModule, AuthModule, DiscordDmModule],
  controllers: [RoomsController, RoomsAdminController],
  providers: [RoomsService, RoomsScheduler],
  exports: [RoomsService],
})
export class RoomsModule {}

