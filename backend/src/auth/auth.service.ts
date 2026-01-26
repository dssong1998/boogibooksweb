import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authorization 헤더에서 userId 추출
   * @param authHeader "Bearer <token>" 형식
   * @returns userId or null
   */
  extractUserIdFromToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.verify(token);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (payload.sub as string) || null;
    } catch {
      return null;
    }
  }

  getDiscordAuthUrl(): string {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      process.env.DISCORD_REDIRECT_URI ||
        'http://localhost:3000/auth/discord/callback',
    );
    const scope = encodeURIComponent(
      'identify email guilds guilds.members.read',
    );

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  }

  async exchangeCodeForToken(code: string): Promise<any> {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri =
      process.env.DISCORD_REDIRECT_URI ||
      'http://localhost:3000/auth/discord/callback';

    const params = new URLSearchParams();
    params.append('client_id', clientId || '');
    params.append('client_secret', clientSecret || '');
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  async getGuildMemberInfo(accessToken: string): Promise<{
    isMember: boolean;
    nickname: string | null;
    roles: string[];
    hasTerrasRole: boolean;
  }> {
    const guildId = process.env.DISCORD_GUILD_ID;
    const terrasRoleId = process.env.DISCORD_TERRAS_ROLE_ID; // 테라스 역할 ID

    if (!guildId) {
      return {
        isMember: false,
        nickname: null,
        roles: [],
        hasTerrasRole: false,
      };
    }

    try {
      // OAuth 유저의 특정 길드 멤버 정보 가져오기
      // @me는 OAuth로 로그인한 사용자를 의미함
      const response = await fetch(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        console.log('Guild member fetch failed:', response.status);
        return {
          isMember: false,
          nickname: null,
          roles: [],
          hasTerrasRole: false,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const memberData: { nick?: string; roles?: string[] } =
        await response.json();
      // nick이 서버 별명, 없으면 null
      // roles는 역할 ID 배열
      const roles = memberData.roles || [];
      const hasTerrasRole = terrasRoleId ? roles.includes(terrasRoleId) : false;

      return {
        isMember: true,
        nickname: memberData.nick || null,
        roles,
        hasTerrasRole,
      };
    } catch (error) {
      console.error('Error fetching guild member info:', error);
      return {
        isMember: false,
        nickname: null,
        roles: [],
        hasTerrasRole: false,
      };
    }
  }

  async createOrUpdateUser(
    discordId: string,
    username: string,
    email: string | null,
    isGuildMember: boolean,
    hasTerrasRole: boolean = false,
  ): Promise<{ user: any; isNewUser: boolean }> {
    let role: UserRole = UserRole.VISITOR;
    if (
      discordId === process.env.ADMIN_ID1 ||
      discordId === process.env.ADMIN_ID2 ||
      discordId === process.env.ADMIN_ID3
    ) {
      role = UserRole.ADMIN;
    } else {
      role = isGuildMember ? UserRole.MEMBER : UserRole.VISITOR;
    }

    // 기존 사용자 확인
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const existingUser = await (this.prisma as any).user.findUnique({
      where: { discordId },
    });

    const isNewUser = !existingUser;

    if (isNewUser) {
      // 신규 가입: 코인 포함해서 생성
      const initialCoins = hasTerrasRole ? 5 : 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const user = await (this.prisma as any).user.create({
        data: {
          discordId,
          username,
          email,
          role,
          isTerras: hasTerrasRole,
          coins: initialCoins,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { user, isNewUser: true };
    } else {
      // 기존 사용자 로그인: 코인은 업데이트하지 않음, isTerras는 업데이트
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const user = await (this.prisma as any).user.update({
        where: { discordId },
        data: {
          username,
          email,
          role,
          isTerras: hasTerrasRole,
          updatedAt: new Date(),
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { user, isNewUser: false };
    }
  }

  generateToken(user: any) {
    const payload = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      sub: user.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      discordId: user.discordId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      username: user.username,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      role: user.role,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      isTerras: user.isTerras || false,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: user.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        discordId: user.discordId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        username: user.username,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        email: user.email,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        role: user.role,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        isTerras: user.isTerras || false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        coins: user.coins || 0,
      },
    };
  }
  async me(token: string) {
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // "Bearer " 접두사 제거
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    let userId: string;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.verify(actualToken);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token');
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      userId = payload.sub;
    } catch {
      // 토큰 만료 또는 검증 실패 시 401 반환
      throw new UnauthorizedException('Token expired or invalid');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
