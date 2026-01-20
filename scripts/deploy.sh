#!/bin/bash

# ====================================
# 부기북스 Docker 배포 스크립트
# ====================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🐳 부기북스 Docker 배포"
echo "📁 프로젝트: $PROJECT_DIR"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${YELLOW}📌 $1${NC}"; }
step() { echo -e "${BLUE}▶ $1${NC}"; }

# Docker 확인
command -v docker &> /dev/null || error "Docker가 설치되어 있지 않습니다."
docker compose version &> /dev/null || error "Docker Compose가 설치되어 있지 않습니다."

# .env 확인
[ ! -f ".env" ] && error ".env 파일이 없습니다. cp env.production.example .env"

MODE=${1:-"help"}

case $MODE in
    "init")
        info "🔧 초기 배포 (SSL 인증서 발급 포함)..."
        
        source .env
        [ -z "$DOMAIN" ] && error ".env에 DOMAIN을 설정하세요."
        [ -z "$EMAIL" ] && error ".env에 EMAIL을 설정하세요."
        
        # certbot 디렉토리 생성
        mkdir -p certbot/www certbot/conf
        
        # 임시 nginx 설정 (SSL 인증서 발급용)
        step "임시 Nginx 시작 (SSL 인증서 발급용)..."
        cat > nginx/conf.d/temp.conf << 'EOF'
server {
    listen 80;
    server_name boogibooks.com www.boogibooks.com api.boogibooks.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'Certbot ready';
        add_header Content-Type text/plain;
    }
}
EOF
        
        docker compose up -d nginx
        sleep 5
        
        step "SSL 인증서 발급..."
        docker run --rm \
            -v ${PROJECT_DIR}/certbot/www:/var/www/certbot \
            -v ${PROJECT_DIR}/certbot/conf:/etc/letsencrypt \
            certbot/certbot certonly --webroot \
            --webroot-path=/var/www/certbot \
            --email ${EMAIL} \
            --agree-tos \
            --no-eff-email \
            -d ${DOMAIN} \
            -d www.${DOMAIN} \
            -d api.${DOMAIN}
        
        # 임시 설정 삭제
        rm -f nginx/conf.d/temp.conf
        
        step "전체 서비스 시작..."
        docker compose down
        docker compose up -d --build
        
        step "데이터베이스 마이그레이션..."
        sleep 10  # DB 준비 대기
        docker compose exec backend npx prisma migrate deploy
        
        success "🎉 초기 배포 완료!"
        echo ""
        docker compose ps
        ;;
        
    "up"|"start")
        info "🚀 서비스 시작..."
        docker compose up -d --build
        success "시작 완료!"
        docker compose ps
        ;;
        
    "down"|"stop")
        info "⏹ 서비스 중지..."
        docker compose down
        success "중지 완료!"
        ;;
        
    "restart")
        info "🔄 서비스 재시작..."
        docker compose restart
        success "재시작 완료!"
        ;;
        
    "rebuild")
        info "🔨 이미지 재빌드 및 재시작..."
        docker compose up -d --build --force-recreate
        success "재빌드 완료!"
        docker compose ps
        ;;
        
    "update")
        info "🔄 업데이트 배포..."
        
        [ -d ".git" ] && { step "Git pull..."; git pull origin main; }
        
        step "이미지 재빌드..."
        docker compose up -d --build
        
        step "마이그레이션..."
        docker compose exec backend npx prisma migrate deploy
        
        success "업데이트 완료!"
        docker compose ps
        ;;
        
    "logs")
        SERVICE=${2:-""}
        if [ -z "$SERVICE" ]; then
            docker compose logs -f
        else
            docker compose logs -f "$SERVICE"
        fi
        ;;
        
    "ps"|"status")
        docker compose ps
        ;;
        
    "migrate")
        info "🗄️ 데이터베이스 마이그레이션..."
        docker compose exec backend npx prisma migrate deploy
        success "마이그레이션 완료!"
        ;;
        
    "seed")
        info "🌱 디스코드 데이터 시드..."
        docker compose exec discord-bot npx ts-node src/scripts/initialSeed.ts
        success "시드 완료!"
        ;;
        
    "shell")
        SERVICE=${2:-"backend"}
        info "🐚 ${SERVICE} 컨테이너 쉘 접속..."
        docker compose exec "$SERVICE" sh
        ;;
        
    "db")
        info "🗄️ PostgreSQL 접속..."
        docker compose exec postgres psql -U boogibooks -d boogibooks
        ;;
        
    "clean")
        info "🧹 미사용 Docker 리소스 정리..."
        docker system prune -f
        docker volume prune -f
        success "정리 완료!"
        ;;
        
    *)
        echo "🐳 부기북스 Docker 배포 스크립트"
        echo ""
        echo "사용법: $0 <명령어> [옵션]"
        echo ""
        echo "📦 배포 명령어:"
        echo "  init      - 초기 배포 (SSL 인증서 발급 포함)"
        echo "  up        - 서비스 시작"
        echo "  down      - 서비스 중지"
        echo "  restart   - 서비스 재시작"
        echo "  rebuild   - 이미지 재빌드 및 재시작"
        echo "  update    - git pull + 재빌드 + 마이그레이션"
        echo ""
        echo "📊 모니터링:"
        echo "  logs      - 로그 확인 (예: $0 logs backend)"
        echo "  ps        - 컨테이너 상태 확인"
        echo ""
        echo "🔧 유틸리티:"
        echo "  migrate   - DB 마이그레이션 실행"
        echo "  seed      - 디스코드 데이터 시드"
        echo "  shell     - 컨테이너 쉘 접속 (예: $0 shell backend)"
        echo "  db        - PostgreSQL 접속"
        echo "  clean     - 미사용 리소스 정리"
        exit 1
        ;;
esac
