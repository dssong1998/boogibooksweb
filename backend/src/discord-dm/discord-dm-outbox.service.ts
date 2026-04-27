import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DISCORD_DM_EMBED_KIND = 'EMBED_DM' as const;

/** discord-bot이 채널에 멤버 기본 권한(보기/쓰기/반응)을 부여할 때 */
export const DISCORD_CHANNEL_MEMBER_GRANT_KIND =
  'CHANNEL_MEMBER_GRANT' as const;

export type DiscordChannelMemberGrantPayload = {
  discordUserId: string;
  channelId: string;
  /** 채널 환영 문구에 사용 */
  roomName?: string;
  /** 방 소개(신청 UI intro) — 환영 메시지 본문에 포함 */
  introMessage?: string;
  /** false면 권한만 부여 */
  sendWelcome?: boolean;
  /** true면 타 방 채널 읽기 전용(보기·히스토리만) */
  readOnly?: boolean;
};

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

  async enqueueChannelMemberGrant(
    discordUserId: string,
    channelId: string,
    meta?: {
      roomName?: string;
      introMessage?: string;
      sendWelcome?: boolean;
      readOnly?: boolean;
    },
  ): Promise<boolean> {
    const uid = discordUserId?.trim();
    const cid = channelId?.trim();
    if (!uid || !cid) {
      this.logger.warn(
        'enqueueChannelMemberGrant: discordUserId 또는 channelId가 비어 있음',
      );
      return false;
    }

    const payload: DiscordChannelMemberGrantPayload = {
      discordUserId: uid,
      channelId: cid,
      ...(meta?.roomName != null && String(meta.roomName).trim() !== ''
        ? { roomName: String(meta.roomName).trim() }
        : {}),
      ...(meta?.introMessage != null && String(meta.introMessage).trim() !== ''
        ? { introMessage: String(meta.introMessage).trim() }
        : {}),
      ...(meta?.sendWelcome === false ? { sendWelcome: false as const } : {}),
      ...(meta?.readOnly === true ? { readOnly: true as const } : {}),
    };

    try {
      await this.prisma.discordDmOutbox.create({
        data: {
          kind: DISCORD_CHANNEL_MEMBER_GRANT_KIND,
          payload: payload as object,
          status: 'PENDING',
        },
      });
      return true;
    } catch (e) {
      this.logger.error('DiscordDmOutbox(CHANNEL_MEMBER_GRANT) 적재 실패', e);
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
