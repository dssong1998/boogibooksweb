import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DiscordDmOutboxService } from '../discord-dm/discord-dm-outbox.service';
import { PrismaService } from '../prisma/prisma.service';

const ROOM_CAPACITY_DEFAULT = 5;
/** 첫 MEMBER 입장 후 방장 디스코드 자동 초대까지 대기 시간 */
const CAPTAIN_DISCORD_AFTER_FIRST_MEMBER_MS = 60 * 60 * 1000;

function normalizeRoomKey(raw: string): 'DONG' | 'AEGEAN' | 'GIBRALTAR' {
  const u = String(raw || '')
    .trim()
    .toUpperCase();
  if (u === 'DONG' || u === 'DONGHAE' || u === 'DONG_HAE') return 'DONG';
  if (u === 'AEGEAN') return 'AEGEAN';
  if (u === 'GIBRALTAR') return 'GIBRALTAR';
  throw new BadRequestException('roomKey가 올바르지 않습니다.');
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordDmOutbox: DiscordDmOutboxService,
  ) {}

  /** 최초 1회: 3개 방이 없다면 생성 */
  private async ensureSeedRooms(): Promise<void> {
    const keys: Array<'DONG' | 'AEGEAN' | 'GIBRALTAR'> = [
      'DONG',
      'AEGEAN',
      'GIBRALTAR',
    ];
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const exists = await (this.prisma as any).room.findUnique({
        where: { key },
      });
      if (exists) continue;

      const name =
        key === 'DONG' ? '동해' : key === 'AEGEAN' ? '에게해' : '지브롤터';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).room.create({
        data: {
          key,
          name,
          capacity: ROOM_CAPACITY_DEFAULT,
          introMessage: '',
        },
      });
    }
  }

  async assertAdmin(actorUserId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const u = await (this.prisma as any).user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!u || u.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
  }

  private async requestDiscordChannelAccessForUser(
    userId: string,
    roomId: string,
    options?: { sendWelcome?: boolean; readOnly?: boolean },
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [user, room] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { discordId: true },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (this.prisma as any).room.findUnique({
        where: { id: roomId },
        select: { discordChannelId: true, name: true, introMessage: true },
      }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const cid = String(room?.discordChannelId ?? '').trim();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const did = String(user?.discordId ?? '').trim();
    if (!cid || !did) return;
    const sendWelcome = options?.sendWelcome !== false;
    await this.discordDmOutbox.enqueueChannelMemberGrant(did, cid, {
      roomName: String(room?.name ?? '').trim(),
      introMessage: String(room?.introMessage ?? '').trim(),
      sendWelcome,
      ...(options?.readOnly === true ? { readOnly: true as const } : {}),
    });
  }

  private countMemberSlots(members: { role?: string }[] | undefined): number {
    if (!Array.isArray(members)) return 0;
    return members.filter((m) => String(m.role) === 'MEMBER').length;
  }

  /**
   * 방장이 지정된 상태에서 1회: 정원(MEMBER) 충족 또는 첫 입장 후 1시간 경과 시
   * 자기 방 채널 풀 권한·환영, 타 방 채널은 읽기 전용.
   */
  private async maybeActivateCaptainDiscordForRoom(
    roomId: string,
  ): Promise<void> {
    await this.ensureSeedRooms();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const room = await (this.prisma as any).room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });
    if (!room) return;
    const slots = this.countMemberSlots(room.members as { role?: string }[]);
    if (slots < 1) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const captainId = room.captainId as string | null | undefined;
    if (!captainId) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (room.captainDiscordActivatedAt) return;

    const readyFull = slots >= ROOM_CAPACITY_DEFAULT;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const joinedAtRaw = room.firstMemberJoinedAt as Date | string | null;
    const joinedAtMs =
      joinedAtRaw != null ? new Date(joinedAtRaw).getTime() : NaN;
    const readyAfterHour =
      joinedAtRaw != null &&
      !Number.isNaN(joinedAtMs) &&
      Date.now() - joinedAtMs >= CAPTAIN_DISCORD_AFTER_FIRST_MEMBER_MS;
    if (!readyFull && !readyAfterHour) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const captainUser = await (this.prisma as any).user.findUnique({
      where: { id: captainId },
      select: { discordId: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const captainDid = String(captainUser?.discordId ?? '').trim();
    if (!captainDid) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const allRooms = await (this.prisma as any).room.findMany({
      orderBy: [{ createdAt: 'asc' }],
    });
    const list = allRooms as any[];

    for (const r of list) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const cid = String(r.discordChannelId ?? '').trim();
      if (!cid) continue;
      const isOwn = String(r.id) === String(roomId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const nm = String(r.name ?? '').trim();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const intro = String(r.introMessage ?? '').trim();
      await this.discordDmOutbox.enqueueChannelMemberGrant(captainDid, cid, {
        roomName: nm,
        ...(isOwn && intro !== '' ? { introMessage: intro } : {}),
        sendWelcome: isOwn,
        readOnly: !isOwn,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).room.update({
      where: { id: roomId },
      data: { captainDiscordActivatedAt: new Date() },
    });
  }

  /** 크론: 첫 입장 후 1시간 경과 등 지연 조건으로 방장 디스코드 활성화 */
  async processCaptainDiscordScheduled(): Promise<void> {
    await this.ensureSeedRooms();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const pending = await (this.prisma as any).room.findMany({
      where: {
        captainId: { not: null },
        captainDiscordActivatedAt: null,
      },
      select: { id: true },
    });
    const rows = pending as Array<{ id: string }>;
    for (const r of rows) {
      await this.maybeActivateCaptainDiscordForRoom(r.id);
    }
  }

  async searchUsersForAdmin(actorUserId: string, query: string) {
    await this.assertAdmin(actorUserId);
    const q = String(query || '').trim();
    if (q.length < 2) {
      return [] as Array<{ id: string; username: string; discordId: string }>;
    }
    if (q.length > 80) {
      throw new BadRequestException('검색어가 너무 깁니다.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const users = await (this.prisma as any).user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { discordId: { contains: q } },
        ],
      },
      select: { id: true, username: true, discordId: true },
      take: 40,
      orderBy: [{ username: 'asc' }],
    });

    return users as Array<{ id: string; username: string; discordId: string }>;
  }

  async listRoomsForUser() {
    await this.ensureSeedRooms();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const rooms = await (this.prisma as any).room.findMany({
      orderBy: [{ createdAt: 'asc' }],
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, discordId: true } },
          },
        },
      },
    });

    return (rooms as any[]).map((r) => {
      const mem = (r.members || []) as any[];
      const memberOnly = mem.filter((m) => String(m.role) === 'MEMBER');
      return {
        key: r.key as string,
        name: r.name as string,
        capacity: Number(r.capacity) || ROOM_CAPACITY_DEFAULT,
        introMessage: (r.introMessage as string) || '',
        discordChannelId: (r.discordChannelId as string) || null,
        memberCount: memberOnly.length,
        members: memberOnly.map((m: any) => ({
          id: m.user.id as string,
          username: m.user.username as string,
          role: m.role as string,
        })),
      };
    });
  }

  /** 관리자: 멤버에 디스코드 ID 포함 */
  async listRoomsAdmin() {
    await this.ensureSeedRooms();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const rooms = await (this.prisma as any).room.findMany({
      orderBy: [{ createdAt: 'asc' }],
      include: {
        captain: { select: { id: true, username: true, discordId: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, discordId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return (rooms as any[]).map((r) => ({
      key: r.key as string,
      name: r.name as string,
      capacity: Number(r.capacity) || ROOM_CAPACITY_DEFAULT,
      introMessage: (r.introMessage as string) || '',
      discordChannelId: (r.discordChannelId as string) || null,
      captainId: (r.captainId as string) || null,
      captain: r.captain
        ? {
            id: r.captain.id as string,
            username: r.captain.username as string,
            discordId: r.captain.discordId as string,
          }
        : null,
      memberCount: this.countMemberSlots(r.members as { role?: string }[]),
      members: (r.members || []).map((m: any) => ({
        id: m.user.id as string,
        username: m.user.username as string,
        discordId: m.user.discordId as string,
        role: m.role as string,
      })),
    }));
  }

  async adminPatchRoom(
    actorUserId: string,
    roomKey: string,
    body: {
      introMessage?: string;
      discordChannelId?: string | null;
    },
  ) {
    await this.assertAdmin(actorUserId);
    const key = normalizeRoomKey(roomKey);

    const data: Record<string, unknown> = {};
    if (body.introMessage !== undefined) data.introMessage = body.introMessage;
    if (body.discordChannelId !== undefined) {
      data.discordChannelId =
        body.discordChannelId === null || body.discordChannelId === ''
          ? null
          : String(body.discordChannelId).trim();
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).room.update({
      where: { key },
      data,
    });

    const rows = await this.listRoomsAdmin();
    return rows.find((x: { key: string }) => x.key === key) ?? null;
  }

  async adminAddMember(
    actorUserId: string,
    roomKey: string,
    targetUserId: string,
  ) {
    await this.assertAdmin(actorUserId);
    const key = normalizeRoomKey(roomKey);
    await this.ensureSeedRooms();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const elsewhere = await (this.prisma as any).roomMember.findUnique({
      where: { userId: targetUserId },
      include: { room: true },
    });
    if (elsewhere) {
      throw new BadRequestException(
        `이미 다른 방(${elsewhere.room.name as string})에 속해 있습니다.`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const room = await (this.prisma as any).room.findUnique({
      where: { key },
      include: { members: true },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    const capacity = Number(room.capacity) || ROOM_CAPACITY_DEFAULT;
    const beforeSlots = this.countMemberSlots(
      room.members as { role?: string }[],
    );
    if (beforeSlots >= capacity) {
      throw new BadRequestException('해당 방 정원이 가득 찼습니다.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).roomMember.create({
      data: {
        room: { connect: { id: room.id as string } },
        user: { connect: { id: targetUserId } },
        role: 'MEMBER',
      },
    });

    if (beforeSlots === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).room.update({
        where: { id: room.id as string },
        data: { firstMemberJoinedAt: new Date() },
      });
    }

    await this.requestDiscordChannelAccessForUser(
      targetUserId,
      room.id as string,
    );
    await this.maybeActivateCaptainDiscordForRoom(room.id as string);

    const rows = await this.listRoomsAdmin();
    return rows.find((x: { key: string }) => x.key === key) ?? null;
  }

  async adminRemoveMember(
    actorUserId: string,
    roomKey: string,
    targetUserId: string,
  ) {
    await this.assertAdmin(actorUserId);
    const key = normalizeRoomKey(roomKey);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const room = await (this.prisma as any).room.findUnique({ where: { key } });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const captainId = room.captainId as string | null;
    if (captainId === targetUserId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).room.update({
        where: { key },
        data: { captainId: null, captainDiscordActivatedAt: null },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).roomMember.deleteMany({
      where: {
        userId: targetUserId,
        roomId: room.id as string,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const updated = await (this.prisma as any).room.findUnique({
      where: { key },
      include: { members: true },
    });
    if (
      updated &&
      this.countMemberSlots(updated.members as { role?: string }[]) === 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).room.update({
        where: { key },
        data: { firstMemberJoinedAt: null },
      });
    }

    const rows = await this.listRoomsAdmin();
    return rows.find((x: { key: string }) => x.key === key) ?? null;
  }

  async adminSetCaptain(
    actorUserId: string,
    roomKey: string,
    targetUserId: string,
  ) {
    await this.assertAdmin(actorUserId);
    const key = normalizeRoomKey(roomKey);
    await this.ensureSeedRooms();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const elsewhere = await (this.prisma as any).roomMember.findUnique({
      where: { userId: targetUserId },
      include: { room: true },
    });
    if (elsewhere && (elsewhere.room.key as string) !== key) {
      throw new BadRequestException(
        `해당 사용자는 이미 다른 방(${elsewhere.room.name as string})에 속해 있습니다.`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const room = await (this.prisma as any).room.findUnique({
      where: { key },
      include: { members: true },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).room.update({
      where: { key },
      data: {
        captainId: targetUserId,
        captainDiscordActivatedAt: null,
      },
    });

    await this.maybeActivateCaptainDiscordForRoom(room.id as string);

    const rows = await this.listRoomsAdmin();
    return rows.find((x: { key: string }) => x.key === key) ?? null;
  }

  async adminRegisterUserAndAddToRoom(
    actorUserId: string,
    roomKey: string,
    discordId: string,
    username: string,
  ) {
    await this.assertAdmin(actorUserId);
    const key = normalizeRoomKey(roomKey);
    const did = String(discordId || '').trim();
    const un = String(username || '').trim();
    if (!did || !un) {
      throw new BadRequestException('discordId와 username을 입력해 주세요.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const dup = await (this.prisma as any).user.findUnique({
      where: { discordId: did },
    });
    if (dup) {
      throw new BadRequestException(
        '이미 등록된 디스코드 ID입니다. 기존 사용자 배정은「멤버 추가」를 사용하세요.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const created = await (this.prisma as any).user.create({
      data: {
        discordId: did,
        username: un,
        role: UserRole.MEMBER,
      },
    });

    try {
      return await this.adminAddMember(actorUserId, key, created.id as string);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).user.delete({
        where: { id: created.id as string },
      });
      throw e;
    }
  }

  async getRoomByKey(roomKey: string) {
    const key = normalizeRoomKey(roomKey);
    await this.ensureSeedRooms();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const room = await (this.prisma as any).room.findUnique({
      where: { key },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, discordId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');
    const mem = (room.members || []) as any[];
    const memberOnly = mem.filter((m) => String(m.role) === 'MEMBER');
    return {
      key: room.key as string,
      name: room.name as string,
      capacity: Number(room.capacity) || ROOM_CAPACITY_DEFAULT,
      introMessage: (room.introMessage as string) || '',
      memberCount: memberOnly.length,
      members: memberOnly.map((m: any) => ({
        id: m.user.id as string,
        username: m.user.username as string,
        role: m.role as string,
      })),
    };
  }

  async getMyRoom(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const membership = await (this.prisma as any).roomMember.findUnique({
      where: { userId },
      include: {
        room: true,
      },
    });
    if (membership) {
      return {
        roomKey: membership.room.key as string,
        roomName: membership.room.name as string,
        role: membership.role as string,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const led = await (this.prisma as any).room.findFirst({
      where: { captainId: userId },
    });
    if (!led) return null;
    return {
      roomKey: led.key as string,
      roomName: led.name as string,
      role: 'CAPTAIN',
    };
  }

  async applyToRoom(userId: string, roomKey: string) {
    const key = normalizeRoomKey(roomKey);
    await this.ensureSeedRooms();

    // 이미 방이 있으면 그대로 반환
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existing = await (this.prisma as any).roomMember.findUnique({
      where: { userId },
      include: { room: true },
    });
    if (existing) {
      return {
        assigned: true,
        roomKey: existing.room.key as string,
        roomName: existing.room.name as string,
        message: '이미 방에 속해 있습니다.',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const room = await (this.prisma as any).room.findUnique({
      where: { key },
      include: { members: true },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((room.captainId as string | null) === userId) {
      throw new BadRequestException(
        '방장은 일반 멤버 신청으로 들어올 수 없습니다.',
      );
    }

    const capacity = Number(room.capacity) || ROOM_CAPACITY_DEFAULT;
    const slots = this.countMemberSlots(room.members as { role?: string }[]);
    if (slots >= capacity) {
      throw new BadRequestException('해당 방 정원이 가득 찼습니다.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).roomMember.create({
      data: {
        room: { connect: { id: room.id as string } },
        user: { connect: { id: userId } },
        role: 'MEMBER',
      },
    });

    if (slots === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).room.update({
        where: { id: room.id as string },
        data: { firstMemberJoinedAt: new Date() },
      });
    }

    await this.requestDiscordChannelAccessForUser(userId, room.id as string);
    await this.maybeActivateCaptainDiscordForRoom(room.id as string);

    return {
      assigned: true,
      roomKey: room.key as string,
      roomName: room.name as string,
      message: '방에 배정되었습니다.',
    };
  }
}
