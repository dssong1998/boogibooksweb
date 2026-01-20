# ====================================
# Frontend Dockerfile (React Router)
# ====================================
FROM node:20-alpine AS builder

WORKDIR /app

# 빌드 시 환경 변수
ARG VITE_API_BASE_URL=https://api.boogibooks.com
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 의존성 설치
COPY package*.json ./
RUN npm ci

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
COPY --from=builder /app/build ./build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
