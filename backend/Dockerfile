# ====================================
# Backend Dockerfile (NestJS)
# ====================================
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# Prisma 생성
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS runner

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --omit=dev

# 빌드 결과물 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main.js"]
