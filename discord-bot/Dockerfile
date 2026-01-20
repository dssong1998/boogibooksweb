# ====================================
# Discord Bot Dockerfile
# ====================================
FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]
