import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DISCORD_DM_EMBED_KIND = 'EMBED_DM' as const;

/** discord-bot이 전송할 임베드 DM 페이로드 */
export type DiscordEmbedDmPayload = {
  recipientId: string;
  title: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  url?: string;
  footerText?: string;
};

@Injectable()
export class DiscordDmOutboxService {
  private readonly logger = new Logger(DiscordDmOutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enqueueEmbedDm(
    recipientDiscordId: string,
    content: Omit<DiscordEmbedDmPayload, 'recipientId'>,
  ): Promise<boolean> {
    const recipientId = recipientDiscordId?.trim();
    if (!recipientId) {
      this.logger.warn('enqueueEmbedDm: recipient Discord ID가 비어 있음');
      return false;
    }

    const payload: DiscordEmbedDmPayload = {
      recipientId,
      ...content,
    };

    try {
      await this.prisma.discordDmOutbox.create({
        data: {
          kind: DISCORD_DM_EMBED_KIND,
          payload: payload as object,
          status: 'PENDING',
        },
      });
      return true;
    } catch (e) {
      this.logger.error('DiscordDmOutbox 적재 실패', e);
      return false;
    }
  }

  listPending(limit: number) {
    const n = Math.min(Math.max(1, limit), 100);
    return this.prisma.discordDmOutbox.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: n,
      select: {
        id: true,
        kind: true,
        payload: true,
      },
    });
  }

  async ackOutbox(
    id: string,
    body: { success: boolean; error?: string },
  ): Promise<void> {
    await this.prisma.discordDmOutbox.update({
      where: { id },
      data: {
        status: body.success ? 'DONE' : 'FAILED',
        error: body.error ?? null,
        processedAt: new Date(),
      },
    });
  }
}
