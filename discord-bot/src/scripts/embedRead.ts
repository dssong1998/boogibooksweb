import {
  Client,
  GatewayIntentBits,
  ChannelType,
  TextChannel,
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const DIGGING_CHANNEL_ID = process.env.DIGGING_CHANNEL_ID || '';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function main() {
  await client.login(BOT_TOKEN);

  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(DIGGING_CHANNEL_ID);

  if (channel && channel.type === ChannelType.GuildText) {
    const messages = await (channel as TextChannel).messages.fetch({
      limit: 5,
    });
    for (const message of messages.values()) {
      console.log(message?.attachments?.first());
    }
    // console.log(Boolean(messages.last()?.messageSnapshots?.first()));
  } else {
    console.error('채널을 찾을 수 없습니다.');
  }

  await client.destroy();
}

main();
