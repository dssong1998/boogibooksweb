import { VoiceState, Guild, VoiceChannel, StageChannel } from 'discord.js';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

// 음성 채널 입장 시간 추적 (userId -> {time, channelName})
const voiceJoinTimes = new Map<string, { time: Date; channelName: string }>();

/**
 * 봇 시작 시 현재 음성 채널에 있는 사용자들을 등록
 * (봇 재시작 후에도 퇴장 추적 가능하게)
 */
export async function initializeVoiceTracking(guild: Guild) {
  console.log('🎤 음성 채널 사용자 초기화 중...');
  
  const voiceChannels = guild.channels.cache.filter(
    (ch): ch is VoiceChannel | StageChannel => 
      ch.type === 2 || ch.type === 13 // GuildVoice = 2, GuildStageVoice = 13
  );

  let count = 0;
  for (const [, channel] of voiceChannels) {
    for (const [userId, member] of channel.members) {
      const username = member.nickname || member.user.username;
      voiceJoinTimes.set(userId, { 
        time: new Date(), // 봇 시작 시간으로 설정
        channelName: channel.name 
      });
      console.log(`  📝 ${username} - ${channel.name}`);
      count++;
    }
  }
  
  console.log(`🎤 ${count}명의 음성 채널 사용자 초기화 완료`);
}

/**
 * 디버깅용: 현재 추적 중인 사용자 출력
 */
export function debugVoiceTracking() {
  console.log('🔍 현재 추적 중인 사용자:');
  voiceJoinTimes.forEach((data, odUserId) => {
    console.log(`  ${odUserId}: ${data.channelName} (${data.time.toISOString()})`);
  });
}

export async function trackVoiceActivity(
  oldState: VoiceState,
  newState: VoiceState,
) {
  const userId = newState.member?.user.id || oldState.member?.user.id;
  const username = newState.member?.nickname || 
                   newState.member?.user.username ||
                   oldState.member?.nickname ||
                   oldState.member?.user.username || 'Unknown';
  
  if (!userId) return;

  // 음성 채널 입장
  if (!oldState.channel && newState.channel) {
    const channelName = newState.channel.name;
    const now = new Date();
    
    voiceJoinTimes.set(userId, { time: now, channelName });
    console.log(`🎤 ${username} 음성 채널 입장: ${channelName}`);

    // TableLog 생성 (VOICE_JOIN)
    try {
      await axios.post(`${BACKEND_URL}/table-logs`, {
        discordUserId: userId,
        type: 'VOICE_JOIN',
        channelName,
        username,
      });
      console.log(`  ✅ TableLog 생성 (입장)`);
    } catch (error: any) {
      console.error(`  ❌ TableLog 생성 실패:`, error.response?.data || error.message);
    }
  }

  // 음성 채널 퇴장
  if (oldState.channel && !newState.channel) {
    const channelName = oldState.channel.name;
    const joinData = voiceJoinTimes.get(userId);
    
    let durationMinutes = 0;
    if (joinData) {
      durationMinutes = Math.floor(
        (new Date().getTime() - joinData.time.getTime()) / 1000 / 60
      );
      voiceJoinTimes.delete(userId);
    }

    console.log(`🎤 ${username} 음성 채널 퇴장: ${channelName} (${durationMinutes}분)`);

    // TableLog 생성 (VOICE_LEAVE)
    try {
      await axios.post(`${BACKEND_URL}/table-logs`, {
        discordUserId: userId,
        type: 'VOICE_LEAVE',
        channelName,
        username,
        durationMinutes,
      });
      console.log(`  ✅ TableLog 생성 (퇴장, ${durationMinutes}분)`);
    } catch (error: any) {
      console.error(`  ❌ TableLog 생성 실패:`, error.response?.data || error.message);
    }
  }

  // 채널 이동 (다른 음성 채널로)
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    const oldChannelName = oldState.channel.name;
    const newChannelName = newState.channel.name;
    
    // 이전 채널 퇴장 처리
    const joinData = voiceJoinTimes.get(userId);
    let durationMinutes = 0;
    if (joinData) {
      durationMinutes = Math.floor(
        (new Date().getTime() - joinData.time.getTime()) / 1000 / 60
      );
    }
    
    console.log(`🎤 ${username} 채널 이동: ${oldChannelName} → ${newChannelName} (${durationMinutes}분)`);

    // 이전 채널 퇴장 로그
    try {
      await axios.post(`${BACKEND_URL}/table-logs`, {
        discordUserId: userId,
        type: 'VOICE_LEAVE',
        channelName: oldChannelName,
        username,
        durationMinutes,
      });
    } catch (error: any) {
      console.error(`  ❌ 퇴장 로그 실패:`, error.response?.data || error.message);
    }

    // 새 채널 입장 로그
    voiceJoinTimes.set(userId, { time: new Date(), channelName: newChannelName });
    try {
      await axios.post(`${BACKEND_URL}/table-logs`, {
        discordUserId: userId,
        type: 'VOICE_JOIN',
        channelName: newChannelName,
        username,
      });
      console.log(`  ✅ 채널 이동 로그 생성`);
    } catch (error: any) {
      console.error(`  ❌ 입장 로그 실패:`, error.response?.data || error.message);
    }
  }
}
