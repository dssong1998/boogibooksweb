import axios from 'axios';
import * as dotenv from 'dotenv';
import {
  ChannelType,
  Client,
  EmbedBuilder,
  type GuildChannel,
} from 'discord.js';

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
      } else if (row.kind === 'CHANNEL_MEMBER_GRANT') {
        await handleChannelMemberGrant(client, row.payload);
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

async function handleChannelMemberGrant(
  client: Client,
  p: Record<string, unknown>,
): Promise<void> {
  const discordUserId = String(p.discordUserId ?? '').trim();
  const channelId = String(p.channelId ?? '').trim();
  if (!discordUserId || !channelId) {
    throw new Error('discordUserId or channelId missing');
  }

  const ch = await client.channels.fetch(channelId);
  if (!ch) {
    throw new Error(`channel not found: ${channelId}`);
  }

  if (
    ch.type !== ChannelType.GuildText &&
    ch.type !== ChannelType.GuildForum
  ) {
    throw new Error(
      `텍스트·포럼 채널만 지원합니다 (type=${ch.type}). 스레드 ID가 아닌 채널 ID를 저장해 주세요.`,
    );
  }

  const guildCh = ch as GuildChannel;
  const readOnly = p.readOnly === true;
  if (readOnly) {
    await guildCh.permissionOverwrites.edit(discordUserId, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      AddReactions: false,
    });
  } else {
    await guildCh.permissionOverwrites.edit(discordUserId, {
      ViewChannel: true,
      SendMessages: true,
      AddReactions: true,
      ReadMessageHistory: true,
    });
  }

  const roomName = String(p.roomName ?? '').trim();
  const introMessage = String(p.introMessage ?? '').trim();
  const sendWelcome = p.sendWelcome !== false && !readOnly;
  if (sendWelcome && roomName !== '') {
    if (!ch.isTextBased()) {
      throw new Error('환영 메시지: 텍스트/포럼 등 메시지 전송 가능한 채널이 아닙니다.');
    }
    const content = buildChannelWelcomeWithIntro(
      discordUserId,
      roomName,
      introMessage,
    );
    await ch.send({
      content,
      allowedMentions: { users: [discordUserId] },
    });
  }
}

const DISCORD_MSG_MAX = 2000;

function buildChannelWelcomeWithIntro(
  discordUserId: string,
  roomName: string,
  introMessage: string,
): string {
  const head = `<@${discordUserId}> 님, **${roomName}** 바다에 오신 것을 환영합니다! 이곳에서 서로의 읽기와 이야기를 나누게 되어 기쁩니다.`;
  if (introMessage === '') {
    return head.length > DISCORD_MSG_MAX
      ? head.slice(0, DISCORD_MSG_MAX - 1) + '…'
      : head;
  }
  const block = `${head}\n\n── 이 바다를 소개합니다 ──\n${introMessage}`;
  if (block.length <= DISCORD_MSG_MAX) {
    return block;
  }
  const section = '\n\n── 이 바다를 소개합니다 ──\n';
  const room = head.length + section.length;
  const maxIntro = Math.max(0, DISCORD_MSG_MAX - room - 1);
  if (maxIntro < 20) {
    return head.length > DISCORD_MSG_MAX
      ? head.slice(0, DISCORD_MSG_MAX - 1) + '…'
      : head;
  }
  return head + section + introMessage.slice(0, maxIntro) + '…';
}
