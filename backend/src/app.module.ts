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
import { LibraryModule } from './library/library.module';
import { BoogiOutModule } from './boogi-out/boogi-out.module';
import { PaymentsModule } from './payments/payments.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RoomsModule } from './rooms/rooms.module';
import { DiscordGuildModule } from './discord-guild/discord-guild.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    LibraryModule,
    BoogiOutModule,
    PaymentsModule,
    EventsModule,
    AuthModule,
    UsersModule,
    BooksModule,
    CommentsModule,
    DiggingModule,
    SeedModule,
    TableLogsModule,
    RoomsModule,
    DiscordGuildModule,
  ],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule {}
