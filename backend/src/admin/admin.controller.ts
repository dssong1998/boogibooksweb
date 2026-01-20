import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { UpdateEventDto } from '../events/dto/update-event.dto';
import { PrismaService } from '../prisma/prisma.service';

// DTO for MonthlyBook
class CreateMonthlyBookDto {
  year: number;
  month: number;
  topic?: string; // 이달의 주제
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
  recommendation?: string;
}

// DTO for Schedule
class CreateScheduleDto {
  title: string;
  description?: string;
  date: string;
  time?: string;
  type?: 'MEETING' | 'SHELLCAST' | 'DIGGING_CLUB' | 'MOVIE_NIGHT' | 'BOOGITOUT';
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
  ) {}

  // ========== 이벤트 관리 ==========
  @Post('events')
  createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get('events')
  getAllEvents() {
    return this.eventsService.findAll();
  }

  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  // 이벤트 신청자 목록 조회
  @Get('events/:id/applications')
  async getEventApplications(@Param('id') eventId: string) {
    return (this.prisma as any).eventApplication.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            email: true,
            isTerras: true,
          },
        },
      },
      orderBy: { applicationOrder: 'asc' },
    });
  }

  // ========== 이달의 책 관리 ==========
  @Post('monthly-book')
  async createMonthlyBook(@Body() dto: CreateMonthlyBookDto) {
    return (this.prisma as any).monthlyBook.create({
      data: {
        year: dto.year,
        month: dto.month,
        topic: dto.topic,
        title: dto.title,
        author: dto.author,
        isbn: dto.isbn,
        publisher: dto.publisher,
        coverUrl: dto.coverUrl,
        description: dto.description,
        recommendation: dto.recommendation,
      },
    });
  }

  @Get('monthly-book')
  async getAllMonthlyBooks() {
    return (this.prisma as any).monthlyBook.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  @Get('monthly-book/current')
  async getCurrentMonthlyBooks() {
    const now = new Date();
    return (this.prisma as any).monthlyBook.findMany({
      where: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Get('monthly-book/:year/:month')
  async getMonthlyBooks(
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return (this.prisma as any).monthlyBook.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Delete('monthly-book/:id')
  async deleteMonthlyBook(@Param('id') id: string) {
    return (this.prisma as any).monthlyBook.delete({
      where: { id },
    });
  }

  // ========== 일정 관리 ==========
  @Post('schedule')
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return (this.prisma as any).schedule.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        time: dto.time,
        type: dto.type || 'MEETING',
      },
    });
  }

  @Get('schedule')
  async getAllSchedules() {
    return (this.prisma as any).schedule.findMany({
      orderBy: { date: 'asc' },
    });
  }

  @Get('schedule/week')
  async getWeekSchedules() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return (this.prisma as any).schedule.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lt: endOfWeek,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  @Get('schedule/month/:year/:month')
  async getMonthSchedules(
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    return (this.prisma as any).schedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  @Patch('schedule/:id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduleDto>,
  ) {
    return (this.prisma as any).schedule.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  @Delete('schedule/:id')
  async deleteSchedule(@Param('id') id: string) {
    return (this.prisma as any).schedule.delete({
      where: { id },
    });
  }
}
