import axios from 'axios';
import * as dotenv from 'dotenv';
import {
  Client,
  ChannelType,
  TextChannel,
  ThreadAutoArchiveDuration,
} from 'discord.js';
dotenv.config();
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
const BOT_SECRET = process.env.BOT_INTERNAL_SECRET || '';
const LIVING_ROOM_ID =
  process.env.LIVING_ROOM_CHANNEL_ID ||
  process.env.DISCORD_LIVING_ROOM_CHANNEL_ID ||
  '';

/** 백엔드에서 온 ISO(UTC) 일시 → 한국 시간, 예: 2026년 4월 2일 수요일 19:30 */
function formatBoogiOutEventDateKorea(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}

export async function processBoogiOutOutboxOnce(client: Client): Promise<void> {
  if (!BOT_SECRET) {
    console.warn('BOT_INTERNAL_SECRET 미설정 — 스킵');
    return;
  }

  let rows: Array<{
    id: string;
    kind: string;
    payload: Record<string, unknown>;
  }> = [];

  try {
    const res = await axios.get(`${BACKEND_URL}/boogi-out-bot/outbox`, {
      params: { limit: 15 },
      headers: { 'x-bot-secret': BOT_SECRET },
      timeout: 30000,
    });
    rows = (res.data || []) as typeof rows;
  } catch (e) {
    console.error('[boogi-out outbox] fetch failed:', e);
    return;
  }

  for (const row of rows) {
    try {
      await handleOne(client, row.kind, row.payload);
      await axios.post(
        `${BACKEND_URL}/boogi-out-bot/outbox/${row.id}/ack`,
        { success: true },
        { headers: { 'x-bot-secret': BOT_SECRET }, timeout: 15000 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[boogi-out outbox] ${row.kind} failed:`, msg);
      try {
        await axios.post(
          `${BACKEND_URL}/boogi-out-bot/outbox/${row.id}/ack`,
          { success: false, error: msg },
          { headers: { 'x-bot-secret': BOT_SECRET }, timeout: 15000 },
        );
      } catch {}
    }
  }
}

async function handleOne(
  client: Client,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  switch (kind) {
    case 'CREATE_PROMO':
      await handleCreatePromo(client, payload);
      break;
    case 'NEW_APPLICATION_PLANNER_DM':
      await handlePlannerDm(client, payload);
      break;
    case 'STANDBY_HEADCOUNT_MET':
      await handleHeadcountDm(client, payload);
      break;
    case 'REMINDER_3D_CHANNEL':
      await handleReminderChannel(client, payload);
      break;
    case 'POST_CLOSE_DM':
      await handlePostCloseDm(client, payload);
      break;
    case 'AFTER_PARTY_SPLIT':
      await handleAfterPartySplit(client, payload);
      break;
    case 'CREATE_ATTENDANCE_THREAD':
      await handleAttendanceThread(client, payload);
      break;
    default:
      console.warn('[boogi-out outbox] unknown kind:', kind);
  }
}

async function handleCreatePromo(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  if (!LIVING_ROOM_ID) {
    console.warn(
      '[boogi-out] LIVING_ROOM_CHANNEL_ID 미설정 — CREATE_PROMO 스킵',
    );
    return;
  }
  const ch = await client.channels.fetch(LIVING_ROOM_ID);
  if (!ch || ch.type !== ChannelType.GuildText) {
    console.warn('[boogi-out] 거실 채널을 찾을 수 없습니다.');
    return;
  }
  const text = ch as TextChannel;
  const title = String(p.title ?? '부깃아웃');
  const description = String(p.description ?? '');
  const location = String(p.location ?? '');
  const eventDateRaw =
    p.eventDate != null && String(p.eventDate).trim() !== ''
      ? String(p.eventDate)
      : '';
  const eventDate = eventDateRaw
    ? formatBoogiOutEventDateKorea(eventDateRaw)
    : '일정: 미정 (함께 조율)';
  const frontendUrl = String(p.frontendUrl ?? '');
  const eventId = String(p.eventId ?? '');
  const image = p.promotionalImageUrl ? String(p.promotionalImageUrl) : null;

  const lines: string[] = [];
  lines.push(`📣 **${title}**`);
  lines.push('');
  lines.push(description);
  lines.push('');
  lines.push(`📍 장소: ${location}`);
  lines.push(`🗓 ${eventDate}`);
  if (frontendUrl && eventId) {
    lines.push('');
    lines.push(`🔗 신청·상세: ${frontendUrl}/boogi-out/${eventId}`);
  }
  if (image) {
    lines.push('');
    lines.push(image);
  }

  await text.send(lines.join('\n'));
}

async function handlePlannerDm(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  const plannerId = p.plannerDiscordId ? String(p.plannerDiscordId) : '';
  if (!plannerId) return;
  const user = await client.users.fetch(plannerId);
  const applicant = String(p.applicantUsername ?? '신청자');
  const responseText = p.responseText ? String(p.responseText) : '';
  const eventTitle = String(p.eventTitle ?? '');
  const afterPartyEnabled = p.afterPartyEnabled === true;
  const budget =
    p.afterPartyBudgetPerPerson != null
      ? Number(p.afterPartyBudgetPerPerson)
      : 0;
  const lines: string[] = [];
  lines.push(`📝 **부깃아웃 신청 알림**`);
  lines.push(`이벤트: **${eventTitle}**`);
  lines.push(`신청자: **${applicant}**`);
  if (responseText) {
    lines.push('');
    lines.push('응답:');
    lines.push(responseText);
  }
  if (afterPartyEnabled && p.afterPartyOptIn != null) {
    lines.push('');
    if (p.afterPartyOptIn === true) {
      lines.push(
        budget > 0
          ? `뒷풀이: 참여 예정 (예상 1인 약 ${budget.toLocaleString('ko-KR')}원)`
          : '뒷풀이: 참여 예정',
      );
    } else {
      lines.push('뒷풀이: 불참');
    }
  }
  await user.send(lines.join('\n'));
}

async function handleHeadcountDm(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  const plannerId = p.plannerDiscordId ? String(p.plannerDiscordId) : '';
  if (!plannerId) return;
  const user = await client.users.fetch(plannerId);
  const mockupUrl = String(p.mockupUrl ?? '');
  const eventTitle = String(p.eventTitle ?? '');
  const lines: string[] = [];
  lines.push(`🎯 **목표 인원 달성**`);
  lines.push(`**${eventTitle}**`);
  lines.push('');
  lines.push('날짜를 함께 정할 차례예요. 아래 링크에서 일정을 조율해 주세요.');
  lines.push(mockupUrl);
  await user.send(lines.join('\n'));
}

async function handleReminderChannel(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  if (!LIVING_ROOM_ID) return;
  const ch = await client.channels.fetch(LIVING_ROOM_ID);
  if (!ch || ch.type !== ChannelType.GuildText) return;
  const text = ch as TextChannel;
  const title = String(p.title ?? '');
  const eventDate = p.eventDate ? String(p.eventDate) : '';
  const location = String(p.location ?? '');
  const frontendUrl = String(p.frontendUrl ?? '');
  const eventId = String(p.eventId ?? '');
  const lines: string[] = [];
  lines.push(`🔔 **부깃아웃 마지막 공지 (개최 3일 전)**`);
  lines.push(`**${title}**`);
  if (eventDate) lines.push(`🗓 ${eventDate}`);
  lines.push(`📍 ${location}`);
  if (frontendUrl && eventId) {
    lines.push(`🔗 ${frontendUrl}/boogi-out/${eventId}`);
  }
  await text.send(lines.join('\n'));
}

async function handlePostCloseDm(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  const userId = p.userDiscordId ? String(p.userDiscordId) : '';
  if (!userId) return;
  const user = await client.users.fetch(userId);
  const eventTitle = String(p.eventTitle ?? '');
  const location = String(p.location ?? '');
  const eventDate = p.eventDate ? String(p.eventDate) : '';
  const perPerson = p.perPerson != null ? Number(p.perPerson) : 0;
  const paymentUrl = String(p.paymentUrl ?? '');
  const proofUrl = String(p.proofUrl ?? '');
  const afterPartyEnabled = p.afterPartyEnabled === true;
  const afterPartyOptIn = p.afterPartyOptIn === true;
  const budget =
    p.afterPartyBudgetPerPerson != null
      ? Number(p.afterPartyBudgetPerPerson)
      : 0;
  const settlementMode = String(p.settlementMode ?? '');
  const bank = p.commissionBankName ? String(p.commissionBankName) : '';
  const account = p.commissionAccountNumber
    ? String(p.commissionAccountNumber)
    : '';

  const lines: string[] = [];
  lines.push(`✅ **부깃아웃 참석 안내**`);
  lines.push(`**${eventTitle}**`);
  if (eventDate) lines.push(`🗓 ${eventDate}`);
  lines.push(`📍 ${location}`);
  lines.push('');
  lines.push(
    `💰 1인 부담(수수료 포함): **${perPerson.toLocaleString('ko-KR')}원**`,
  );
  lines.push(`결제/안내 페이지: ${paymentUrl}`);
  lines.push(`결제 완료 증명 페이지: ${proofUrl}`);
  if (settlementMode === 'COMMISSION' && (bank || account)) {
    lines.push('');
    lines.push(`🏦 입금: ${bank} ${account}`.trim());
  }
  if (afterPartyEnabled && afterPartyOptIn) {
    lines.push('');
    if (budget > 0) {
      lines.push(`🍻 뒷풀이 예상(1인): 약 ${budget.toLocaleString('ko-KR')}원`);
    }
    lines.push(
      '뒷풀이 비용은 모임 종료 후 개별 DM으로 더치페이(1/n) 안내드릴 예정입니다.',
    );
  }
  await user.send(lines.join('\n'));
}

async function handleAfterPartySplit(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  const ids = (p.userDiscordIds as string[]) || [];
  const each = p.each != null ? Number(p.each) : 0;
  const bank = p.bankName ? String(p.bankName) : '';
  const account = String(p.accountNumber ?? '');
  const eventTitle = String(p.eventTitle ?? '');
  const total = p.totalAmount != null ? Number(p.totalAmount) : 0;
  const lines: string[] = [];
  lines.push(`🧾 **뒷풀이 1/n 정산**`);
  lines.push(`**${eventTitle}**`);
  lines.push(`총액: ${total.toLocaleString('ko-KR')}원`);
  lines.push(`1인: **${each.toLocaleString('ko-KR')}원**`);
  lines.push(
    bank
      ? `입금: ${bank} ${account}`.trim()
      : `입금 계좌: ${account}`,
  );

  const body = lines.join('\n');
  for (const id of ids) {
    try {
      const u = await client.users.fetch(id);
      await u.send(body);
    } catch {
      // ignore
    }
  }
}

async function handleAttendanceThread(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  if (!LIVING_ROOM_ID) {
    console.warn(
      '[boogi-out] LIVING_ROOM_CHANNEL_ID 미설정 — 스레드 스킵',
    );
    return;
  }
  const ch = await client.channels.fetch(LIVING_ROOM_ID);
  if (!ch || ch.type !== ChannelType.GuildText) return;
  const text = ch as TextChannel;
  const title = String(p.title ?? '부깃아웃');
  const mentionIds = (p.mentionDiscordIds as string[]) || [];

  const thread = await text.threads.create({
    name: title.slice(0, 90),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    reason: 'BoogiOut attendance',
  });

  const mentions = mentionIds.map((id) => `<@${id}>`).join(' ');
  await thread.send(
    `👋 참석자 전용 스레드입니다.\n${mentions || '(멘션 없음)'}`,
  );
}
