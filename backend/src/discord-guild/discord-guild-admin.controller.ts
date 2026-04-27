import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DiscordGuildService } from './discord-guild.service';

@Controller('admin/discord')
export class DiscordGuildAdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly discordGuildService: DiscordGuildService,
  ) {}

  private getActorUserId(authHeader: string | undefined): string {
    const userId = this.authService.extractUserIdFromToken(authHeader);
    if (!userId) throw new UnauthorizedException('Invalid or missing token');
    return userId;
  }

  /** 길드 채널 목록 (텍스트·공지·포럼) — 방 연동용 드롭다운 */
  @Get('channels')
  async listChannels(@Headers('Authorization') authHeader: string) {
    const actor = this.getActorUserId(authHeader);
    return this.discordGuildService.listGuildChannelsForAdmin(actor);
  }
}
