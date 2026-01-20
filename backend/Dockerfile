# ====================================
# Backend Dockerfile (NestJS)
# ====================================
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma/
RUN npx prisma generate

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS runner

WORKDIR /app

# 프로덕션 의존성 + Prisma 클라이언트
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# 빌드 결과물 복사
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

# 시작 시 DB 마이그레이션 후 서버 실행
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main.js"]
