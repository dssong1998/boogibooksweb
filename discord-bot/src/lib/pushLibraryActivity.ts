import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

export async function pushLibraryActivityToBackend(payload: {
  discordUserId: string;
  sourceId: string;
  kind: 'message' | 'thread';
  occurredAt: string;
}): Promise<void> {
  const secret = process.env.BOT_INTERNAL_SECRET;
  if (!secret) {
    console.warn(
      '[library-activity] BOT_INTERNAL_SECRET 미설정 — 백엔드 반영 생략',
    );
    return;
  }

  try {
    await axios.post(
      `${BACKEND_URL}/library-activity/bot`,
      {
        discordUserId: payload.discordUserId,
        sourceId: payload.sourceId,
        kind: payload.kind,
        occurredAt: payload.occurredAt,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': secret,
        },
        timeout: 10000,
      },
    );
  } catch (err) {
    console.error('[library-activity] 백엔드 전송 실패:', err);
  }
}
