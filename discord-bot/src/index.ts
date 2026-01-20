import { Client, GatewayIntentBits, Events, Message, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
import { handleBookMessage } from './handlers/bookHandler';
import { handleDiggingMessage } from './handlers/diggingHandler';
import { trackVoiceActivity, initializeVoiceTracking } from './handlers/voiceHandler';

dotenv.config();

const GUILD_ID = process.env.DISCORD_GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ 부기북스 봇 로그인 성공: ${c.user.tag}`);
  
  // 봇 시작 시 현재 음성 채널에 있는 사용자들 초기화
  if (GUILD_ID) {
    try {
      const guild = await c.guilds.fetch(GUILD_ID);
      await initializeVoiceTracking(guild);
    } catch (error) {
      console.error('❌ 음성 채널 초기화 실패:', error);
    }
  }
});

// 채널 이름 안전하게 가져오기
function getChannelName(channel: Message['channel']): string | null {
  if ('name' in channel && channel.name) {
    return channel.name;
  }
  return null;
}

// 메시지 처리
client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;
  
  // DM 채널 무시
  if (message.channel.type === ChannelType.DM) return;

  const channelName = getChannelName(message.channel);

  // 서재 채널에서 책 관련 메시지 감지
  if (message.channel.id === process.env.BOOKS_CHANNEL_ID || 
      channelName === '서재' || 
      channelName === 'books') {
    await handleBookMessage(message);
  }

  // 디깅 채널에서 링크 감지
  if (message.channel.id === process.env.DIGGING_CHANNEL_ID || 
      channelName === '디깅박스' || 
      channelName === 'digging') {
    await handleDiggingMessage(message);
  }

  // URL 감지 (모든 채널에서)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.content.match(urlRegex);
  if (urls && urls.length > 0) {
    await handleDiggingMessage(message);
  }
});

// 음성 채널 활동 추적
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  await trackVoiceActivity(oldState, newState);
});

// 봇 시작
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN이 설정되지 않았습니다.');
  process.exit(1);
}

client.login(token);
