import axios from 'axios';
import * as dotenv from 'dotenv';
import { Client, EmbedBuilder } from 'discord.js';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
const BOT_SECRET = process.env.BOT_INTERNAL_SECRET || '';

function footerIconUrl(): string {
  const base = process.env.FRONTEND_URL || 'https://boogibooks.com';
  return `${base.replace(/\/$/, '')}/logo.png`;
}

export async function processDiscordDmOutboxOnce(client: Client): Promise<void> {
  if (!BOT_SECRET) {
    return;
  }

  let rows: Array<{
    id: string;
    kind: string;
    payload: Record<string, unknown>;
  }> = [];

  try {
    const res = await axios.get(`${BACKEND_URL}/discord-dm-bot/outbox`, {
      params: { limit: 20 },
      headers: { 'x-bot-secret': BOT_SECRET },
      timeout: 30000,
    });
    rows = (res.data || []) as typeof rows;
  } catch (e) {
    console.error('[discord-dm outbox] fetch failed:', e);
    return;
  }

  for (const row of rows) {
    try {
      if (row.kind === 'EMBED_DM') {
        await handleEmbedDm(client, row.payload);
      } else {
        throw new Error(`unknown kind: ${row.kind}`);
      }
      await axios.post(
        `${BACKEND_URL}/discord-dm-bot/outbox/${row.id}/ack`,
        { success: true },
        { headers: { 'x-bot-secret': BOT_SECRET }, timeout: 15000 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[discord-dm outbox] ${row.kind} failed:`, msg);
      try {
        await axios.post(
          `${BACKEND_URL}/discord-dm-bot/outbox/${row.id}/ack`,
          { success: false, error: msg },
          { headers: { 'x-bot-secret': BOT_SECRET }, timeout: 15000 },
        );
      } catch {
        // ignore
      }
    }
  }
}

async function handleEmbedDm(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  const recipientId = String(p.recipientId ?? '').trim();
  if (!recipientId) {
    throw new Error('recipientId missing');
  }

  const user = await client.users.fetch(recipientId);

  const embed = new EmbedBuilder()
    .setTitle(String(p.title ?? ''))
    .setDescription(String(p.description ?? ''))
    .setColor(
      typeof p.color === 'number'
        ? p.color
        : Number(p.color) || 0x7c9070,
    )
    .setTimestamp(new Date());

  const fields = (p.fields as
    | { name: string; value: string; inline?: boolean }[]
    | undefined) ?? [];
  for (const f of fields) {
    if (f?.name != null && f?.value != null) {
      embed.addFields({
        name: String(f.name),
        value: String(f.value),
        inline: Boolean(f.inline),
      });
    }
  }

  if (p.url != null && String(p.url).trim() !== '') {
    embed.setURL(String(p.url));
  }

  const footerText =
    p.footerText != null && String(p.footerText).trim() !== ''
      ? String(p.footerText)
      : '부기북스 | 링크를 클릭하면 결제창이 열립니다';

  embed.setFooter({ text: footerText, iconURL: footerIconUrl() });

  await user.send({ embeds: [embed] });
}
