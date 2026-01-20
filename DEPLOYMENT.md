# 🐳 부기북스 Docker 배포 가이드

## 📋 서버 요구사항
- Ubuntu 20.04+ LTS
- Docker 24+
- Docker Compose v2+
- 최소 2GB RAM (권장 4GB)

---

## 🔧 1단계: Docker 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 플러그인 설치
sudo apt install docker-compose-plugin -y

# 현재 유저를 docker 그룹에 추가 (재로그인 필요)
sudo usermod -aG docker $USER

# 확인
docker --version
docker compose version
```

---

## 🔄 2단계: 기존 설정 해제

```bash
# 기존 Nginx 설정 확인 및 해제
ls /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/기존_boogibooks.conf

# 기존 PM2 프로세스 정리 (있다면)
pm2 delete all
pm2 save

# Nginx 중지 (Docker Nginx 사용)
sudo systemctl stop nginx
sudo systemctl disable nginx
```

---

## 📦 3단계: 프로젝트 업로드

```bash
# Git 클론
cd /var/www
git clone YOUR_REPO_URL boogibooks-web
cd boogibooks-web

# 또는 rsync 사용
rsync -avz --exclude 'node_modules' --exclude 'ios-app' . root@서버IP:/var/www/boogibooks-web/
```

---

## ⚙️ 4단계: 환경 변수 설정

```bash
cp env.production.example .env
nano .env
```

### 필수 설정값
```env
# 도메인 & SSL
DOMAIN=boogibooks.com
EMAIL=your-email@example.com

# 데이터베이스
POSTGRES_PASSWORD=강력한_비밀번호_설정

# JWT (생성: openssl rand -base64 32)
JWT_SECRET=랜덤_시크릿_키

# Discord
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
TABLE_LOG_CHANNEL_ID=식탁방명록_채널_ID
```

---

## 🚀 5단계: 배포 실행

```bash
# 스크립트 실행 권한
chmod +x scripts/deploy.sh

# 초기 배포 (SSL 인증서 발급 포함)
./scripts/deploy.sh init
```

초기 배포가 완료되면:
- ✅ PostgreSQL 컨테이너 실행
- ✅ Backend API 컨테이너 실행
- ✅ Frontend 컨테이너 실행
- ✅ Discord Bot 컨테이너 실행
- ✅ Nginx 리버스 프록시 실행
- ✅ Certbot SSL 인증서 자동 갱신

---

## 📝 자주 사용하는 명령어

```bash
# 서비스 시작/중지
./scripts/deploy.sh up       # 시작
./scripts/deploy.sh down     # 중지
./scripts/deploy.sh restart  # 재시작

# 로그 확인
./scripts/deploy.sh logs           # 전체 로그
./scripts/deploy.sh logs backend   # 백엔드 로그
./scripts/deploy.sh logs frontend  # 프론트엔드 로그
./scripts/deploy.sh logs nginx     # Nginx 로그

# 상태 확인
./scripts/deploy.sh ps

# 코드 업데이트 배포
./scripts/deploy.sh update

# 컨테이너 쉘 접속
./scripts/deploy.sh shell backend
./scripts/deploy.sh shell frontend

# PostgreSQL 접속
./scripts/deploy.sh db

# 디스코드 데이터 시드
./scripts/deploy.sh seed
```

---

## 🐳 Docker 직접 명령어

```bash
# 컨테이너 상태
docker compose ps

# 로그 확인
docker compose logs -f backend
docker compose logs -f --tail=100 nginx

# 컨테이너 재시작
docker compose restart backend

# 이미지 재빌드
docker compose up -d --build backend

# 전체 재빌드
docker compose up -d --build --force-recreate

# 모든 컨테이너 중지 및 삭제
docker compose down

# 볼륨까지 삭제 (⚠️ DB 데이터 삭제됨!)
docker compose down -v
```

---

## 🗄️ 데이터베이스 관리

### 마이그레이션
```bash
docker compose exec backend npx prisma migrate deploy
```

### DB 백업
```bash
docker compose exec postgres pg_dump -U boogibooks boogibooks > backup_$(date +%Y%m%d).sql
```

### DB 복원
```bash
cat backup.sql | docker compose exec -T postgres psql -U boogibooks boogibooks
```

---

## 🔍 트러블슈팅

### 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker compose logs backend
docker compose logs postgres

# 컨테이너 상태 상세
docker compose ps -a

# 재빌드
docker compose up -d --build --force-recreate
```

### SSL 인증서 문제
```bash
# 인증서 상태 확인
ls -la certbot/conf/live/

# 수동 갱신
docker compose run --rm certbot renew
docker compose restart nginx
```

### 포트 충돌
```bash
# 80, 443 포트 사용 확인
sudo lsof -i :80
sudo lsof -i :443

# 기존 Nginx 중지
sudo systemctl stop nginx
```

### DB 연결 에러
```bash
# PostgreSQL 로그 확인
docker compose logs postgres

# 컨테이너 재시작
docker compose restart postgres

# 헬스체크 확인
docker compose exec postgres pg_isready -U boogibooks
```

---

## 📊 모니터링

```bash
# 리소스 사용량
docker stats

# 디스크 사용량
docker system df

# 미사용 리소스 정리
docker system prune -f
```

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (443/80)                       │
│                   boogibooks.com → frontend:3000            │
│               api.boogibooks.com → backend:3000             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Frontend    │    │    Backend    │    │  Discord Bot  │
│ (React Router)│    │   (NestJS)    │    │  (discord.js) │
│   Port 3000   │    │   Port 3000   │    │               │
└───────────────┘    └───────┬───────┘    └───────┬───────┘
                             │                     │
                             ▼                     │
                     ┌───────────────┐             │
                     │  PostgreSQL   │◄────────────┘
                     │   Port 5432   │
                     └───────────────┘
```

---

## 🔗 URL

| 서비스 | URL |
|--------|-----|
| 웹사이트 | https://boogibooks.com |
| API | https://api.boogibooks.com |
| 헬스체크 | https://api.boogibooks.com/health |

---

## ⚠️ Discord 설정 필수

Discord Developer Portal에서 OAuth2 Redirect URL 추가:
```
https://api.boogibooks.com/auth/discord/callback
```
