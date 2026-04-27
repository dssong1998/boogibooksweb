import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordGuildAdminController } from './discord-guild-admin.controller';
import { DiscordGuildService } from './discord-guild.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DiscordGuildAdminController],
  providers: [DiscordGuildService],
  exports: [DiscordGuildService],
})
export class DiscordGuildModule {}
