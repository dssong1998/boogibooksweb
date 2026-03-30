import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LibraryActivityController } from './library-activity.controller';
import { LibraryActivityService } from './library-activity.service';

@Module({
  imports: [PrismaModule],
  controllers: [LibraryActivityController],
  providers: [LibraryActivityService],
  exports: [LibraryActivityService],
})
export class LibraryModule {}
