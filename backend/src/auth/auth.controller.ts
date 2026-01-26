import { Controller, Get, Query, Res, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('discord/url')
  getDiscordAuthUrl() {
    return {
      url: this.authService.getDiscordAuthUrl(),
    };
  }

  @Get('discord')
  discordAuth(@Res() res: Response) {
    const url = this.authService.getDiscordAuthUrl();
    return res.redirect(url);
  }

  @Get('discord/callback')
  async discordCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth/callback?error=no_code`,
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const oauthTokenData = await this.authService.exchangeCodeForToken(code);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userInfo = await this.authService.getUserInfo(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        oauthTokenData.access_token,
      );
      // Discord 서버 멤버 정보 확인 (멤버 여부 + 서버 별명)
      const guildMemberInfo = await this.authService.getGuildMemberInfo(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        oauthTokenData.access_token,
      );

      // 서버 별명이 있으면 사용, 없으면 Discord 표시 이름, 그것도 없으면 유저네임
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const displayName =
        guildMemberInfo.nickname ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        userInfo.global_name ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        userInfo.username;

      // 사용자 생성 또는 업데이트 (테라스 역할 여부 전달)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { user, isNewUser } = await this.authService.createOrUpdateUser(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        userInfo.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        displayName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        userInfo.email || null,
        guildMemberInfo.isMember,
        guildMemberInfo.hasTerrasRole,
      );

      console.log(
        `User ${isNewUser ? 'created' : 'logged in'}: ${displayName}`,
      );

      // JWT 토큰 생성
      const authTokenData = this.authService.generateToken(user);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${authTokenData.access_token}`,
      );
    } catch (error) {
      console.error('Discord OAuth error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/auth/callback?error=auth_failed`);
    }
  }
  @Get('me')
  me(@Headers('Authorization') token: string) {
    const me = this.authService.me(token);
    console.log('me:', me);
    return me;
  }
}
