# 부기북스 Discord 봇

Discord 서버에서 활동을 자동으로 추적하고 데이터베이스에 저장하는 봇입니다.

## 기능

### 1. 자동 서재 추가
- 서재 채널에 ISBN 포함 메시지 감지
- 네이버 도서 검색 API로 책 정보 조회
- 자동으로 사용자 서재에 추가
- "읽었어요", "완독" 키워드로 완독 기록

### 2. 자동 디깅박스 추가
- 모든 채널에서 URL 포함 메시지 감지
- 자동으로 디깅박스에 추가
- 링크와 함께 작성된 텍스트를 설명으로 저장

### 3. 음성 채널 활동 추적
- 음성 채널 입장/퇴장 시간 기록
- 총 체류 시간 계산
- 방문 일수 카운트

### 4. 슬래시 커맨드
- `/내통계` - 개인 활동 통계 조회

## 설치 및 실행

```bash
# 의존성 설치
npm install

# .env 파일 설정
cp .env.example .env
# .env 파일을 열어 토큰과 설정 입력

# 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 환경 변수

- `DISCORD_BOT_TOKEN`: Discord 봇 토큰
- `DISCORD_GUILD_ID`: Discord 서버 ID
- `BACKEND_API_URL`: 백엔드 API URL
- `BOOKS_CHANNEL_ID`: 서재 채널 ID (선택사항)
- `DIGGING_CHANNEL_ID`: 디깅 채널 ID (선택사항)

## Discord Developer Portal 설정

1. https://discord.com/developers/applications
2. 애플리케이션 생성
3. Bot 섹션에서 토큰 발급
4. Privileged Gateway Intents 활성화:
   - Server Members Intent
   - Message Content Intent
5. OAuth2 > URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Permissions: 
     - Read Messages/View Channels
     - Send Messages
     - Add Reactions
     - Use Slash Commands
