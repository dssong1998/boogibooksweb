import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { AuthService } from '../auth/auth.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly authService: AuthService,
  ) {}

  private getUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  /** 유저용: 방 목록 + 인트로/정원/현황 */
  @Get()
  listRooms() {
    return this.roomsService.listRoomsForUser();
  }

  /** 유저용: 방 신청(배정) */
  @Post('apply')
  apply(
    @Headers('Authorization') authHeader: string,
    @Body() body: { roomKey: string },
  ) {
    const userId = this.getUserId(authHeader);
    return this.roomsService.applyToRoom(userId, body.roomKey);
  }

  /** 유저용: 내 방 확인 */
  @Get('me')
  myRoom(@Headers('Authorization') authHeader: string) {
    const userId = this.getUserId(authHeader);
    return this.roomsService.getMyRoom(userId);
  }

  /** 관리자/운영용(간단): 방 단건 조회 */
  @Get(':key')
  getOne(@Param('key') key: string) {
    return this.roomsService.getRoomByKey(key);
  }
}

