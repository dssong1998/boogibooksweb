import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { CommentsModule } from './comments/comments.module';
import { DiggingModule } from './digging/digging.module';
import { AdminController } from './admin/admin.controller';
import { SeedModule } from './seed/seed.module';
import { TableLogsModule } from './table-logs/table-logs.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    AuthModule,
    UsersModule,
    BooksModule,
    CommentsModule,
    DiggingModule,
    SeedModule,
    TableLogsModule,
  ],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule {}
