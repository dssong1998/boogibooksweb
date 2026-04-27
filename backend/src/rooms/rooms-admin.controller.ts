import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { RoomsService } from './rooms.service';

@Controller('admin/rooms')
export class RoomsAdminController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly authService: AuthService,
  ) {}

  private getActorUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  @Get()
  async list(@Headers('Authorization') authHeader: string) {
    const actor = this.getActorUserId(authHeader);
    await this.roomsService.assertAdmin(actor);
    return this.roomsService.listRoomsAdmin();
  }

  /** 닉네임·Discord ID 부분 검색 (방장 지정용) */
  @Get('members/search')
  async searchMembers(
    @Headers('Authorization') authHeader: string,
    @Query('q') q?: string,
  ) {
    const actor = this.getActorUserId(authHeader);
    return this.roomsService.searchUsersForAdmin(actor, q ?? '');
  }

  @Patch(':key')
  async patchRoom(
    @Headers('Authorization') authHeader: string,
    @Param('key') key: string,
    @Body()
    body: {
      introMessage?: string;
      discordChannelId?: string | null;
    },
  ) {
    const actor = this.getActorUserId(authHeader);
    return this.roomsService.adminPatchRoom(actor, key, body);
  }

  @Post(':key/members')
  async addMember(
    @Headers('Authorization') authHeader: string,
    @Param('key') key: string,
    @Body() body: { userId: string },
  ) {
    const actor = this.getActorUserId(authHeader);
    return this.roomsService.adminAddMember(actor, key, body.userId);
  }

  @Delete(':key/members/:userId')
  async removeMember(
    @Headers('Authorization') authHeader: string,
    @Param('key') key: string,
    @Param('userId') userId: string,
  ) {
    const actor = this.getActorUserId(authHeader);
    return this.roomsService.adminRemoveMember(actor, key, userId);
  }

  @Patch(':key/captain')
  async setCaptain(
    @Headers('Authorization') authHeader: string,
    @Param('key') key: string,
    @Body() body: { userId: string },
  ) {
    const actor = this.getActorUserId(authHeader);
    return this.roomsService.adminSetCaptain(actor, key, body.userId);
  }

  @Post(':key/register-user')
  async registerUser(
    @Headers('Authorization') authHeader: string,
    @Param('key') key: string,
    @Body() body: { discordId: string; username: string },
  ) {
    const actor = this.getActorUserId(authHeader);
    return this.roomsService.adminRegisterUserAndAddToRoom(
      actor,
      key,
      body.discordId,
      body.username,
    );
  }
}
