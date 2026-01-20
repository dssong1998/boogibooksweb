import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  // 이벤트 신청 자격 확인
  @Get(':id/eligibility')
  checkEligibility(
    @Param('id') eventId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.eventsService.checkApplicationEligibility(userId, eventId);
  }

  // 이벤트 신청
  @Post(':id/apply')
  apply(
    @Param('id') eventId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { useCoins?: boolean },
  ) {
    return this.eventsService.applyToEvent(userId, eventId, body.useCoins);
  }

  // 결제 완료 처리 (토큰 없이 userId를 body로 받을 수 있음)
  @Post(':id/confirm-payment')
  confirmPayment(
    @Param('id') eventId: string,
    @Headers('x-user-id') headerUserId: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = bodyUserId || headerUserId;
    return this.eventsService.confirmPayment(userId, eventId);
  }

  // 신청 취소
  @Delete(':id/cancel')
  cancelApplication(
    @Param('id') eventId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.eventsService.cancelApplication(userId, eventId);
  }

  // 관리자: 신청자 목록 조회
  @Get(':id/applications')
  getApplications(@Param('id') eventId: string) {
    return this.eventsService.getApplications(eventId);
  }

  // 관리자: 신청 승인
  @Post(':id/approve')
  approveApplications(
    @Param('id') eventId: string,
    @Body() body: { applicationIds: string[] },
  ) {
    return this.eventsService.approveApplications(eventId, body.applicationIds);
  }
}
