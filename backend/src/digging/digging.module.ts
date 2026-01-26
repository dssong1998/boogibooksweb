import { Module } from '@nestjs/common';
import { DiggingService } from './digging.service';
import { DiggingController } from './digging.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DiggingController],
  providers: [DiggingService],
  exports: [DiggingService],
})
export class DiggingModule {}
