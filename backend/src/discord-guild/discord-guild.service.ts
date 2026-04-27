import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Discord ChannelType: 텍스트·공지·포럼만 방 연동에 사용 */
const SELECTABLE_CHANNEL_TYPES = new Set([0, 5, 15]);

export type DiscordGuildChannelOption = {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  /** 선택 UI용 (카테고리 › 채널) */
  label: string;
};

@Injectable()
export class DiscordGuildService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAdmin(actorUserId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    });
    if (!u || u.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
  }

  async listGuildChannelsForAdmin(actorUserId: string): Promise<
    DiscordGuildChannelOption[]
  > {
    await this.assertAdmin(actorUserId);

    const token = process.env.DISCORD_BOT_TOKEN?.trim();
    const guildId = process.env.DISCORD_GUILD_ID?.trim();
    if (!token || !guildId) {
      throw new ServiceUnavailableException(
        '서버에 DISCORD_BOT_TOKEN / DISCORD_GUILD_ID가 설정되어 있지 않습니다.',
      );
    }

    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(
        `Discord 채널 목록을 가져오지 못했습니다. (${res.status}) ${text.slice(0, 200)}`,
      );
    }

    const raw = (await res.json()) as Array<{
      id: string;
      name: string;
      type: number;
      parent_id: string | null;
      position?: number;
    }>;

    const categoryNames = new Map<string, string>();
    for (const c of raw) {
      if (c.type === 4) {
        categoryNames.set(c.id, c.name);
      }
    }

    const selectable = raw.filter((c) => SELECTABLE_CHANNEL_TYPES.has(c.type));

    const sorted = [...selectable].sort((a, b) => {
      const pa = a.parent_id ?? '';
      const pb = b.parent_id ?? '';
      if (pa !== pb) return pa.localeCompare(pb);
      return (a.position ?? 0) - (b.position ?? 0);
    });

    return sorted.map((c) => {
      const parentName = c.parent_id
        ? categoryNames.get(c.parent_id) ?? ''
        : '';
      const typeLabel =
        c.type === 15 ? '[포럼]' : c.type === 5 ? '[공지]' : '[텍스트]';
      const label = parentName
        ? `${parentName} › ${typeLabel} ${c.name}`
        : `${typeLabel} ${c.name}`;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id,
        label,
      };
    });
  }
}
