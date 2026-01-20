import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

export const data = new SlashCommandBuilder()
  .setName('내통계')
  .setDescription('나의 부기북스 활동 통계를 확인합니다');

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const response = await axios.get(`${BACKEND_URL}/users/${interaction.user.id}/stats`, {
      headers: {
        'user-id': interaction.user.id,
      },
    });

    const stats = response.data;

    const embed = {
      color: 0x8b9d83,
      title: '📊 나의 부기북스 통계',
      fields: [
        {
          name: '📚 읽은 책',
          value: `${stats.totalBooksRead || 0}권`,
          inline: true,
        },
        {
          name: '🎤 음성채널',
          value: `${Math.floor((stats.voiceChannelMinutes || 0) / 60)}시간`,
          inline: true,
        },
        {
          name: '📅 방문일수',
          value: `${stats.voiceChannelDays || 0}일`,
          inline: true,
        },
        {
          name: '✅ 출석률',
          value: `${(stats.attendanceRate || 0).toFixed(1)}%`,
          inline: true,
        },
        {
          name: '🎉 참여 이벤트',
          value: `${stats.eventsParticipated || 0}회`,
          inline: true,
        },
        {
          name: '💰 보유 코인',
          value: `${stats.coins || 0}개`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('통계 조회 실패:', error);
    await interaction.editReply('통계를 불러오는데 실패했습니다.');
  }
}
