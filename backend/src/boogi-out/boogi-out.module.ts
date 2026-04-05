import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ObjectStorageModule } from '../object-storage/object-storage.module';
import { BoogiOutService } from './boogi-out.service';
import { BoogiOutController } from './boogi-out.controller';
import { BoogiOutBotController } from './boogi-out-bot.controller';
import { BoogiOutScheduler } from './boogi-out.scheduler';

@Module({
  imports: [PrismaModule, AuthModule, ObjectStorageModule],
  controllers: [BoogiOutController, BoogiOutBotController],
  providers: [BoogiOutService, BoogiOutScheduler],
  exports: [BoogiOutService],
})
export class BoogiOutModule {}
