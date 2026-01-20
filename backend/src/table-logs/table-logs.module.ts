import { Module } from '@nestjs/common';
import { TableLogsController } from './table-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TableLogsController],
})
export class TableLogsModule {}
