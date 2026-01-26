import { Module } from '@nestjs/common';
import { TableLogsController } from './table-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TableLogsController],
})
export class TableLogsModule {}
