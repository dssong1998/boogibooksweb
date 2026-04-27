# ====================================
# Frontend Dockerfile (React Router)
# ====================================
# Vite는 빌드 시점에 VITE_* 를 번들에 박습니다. docker compose build.args / docker build --build-arg 로 넘기세요.
FROM node:20-alpine AS builder

WORKDIR /app

# --- API ---
ARG VITE_API_BASE_URL=https://api.boogibooks.com
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# --- 링크 미리보기(Open Graph) — app/lib/shareMeta.ts ---
# 공개 사이트 URL (og:image 절대 경로에 필요). 보통 프론트 공개 도메인과 동일
ARG VITE_SITE_URL=https://boogibooks.com
ENV VITE_SITE_URL=${VITE_SITE_URL}

# 비우면 코드 기본값(부기북스 문구) 사용
ARG VITE_OG_TITLE="부기북스"
ENV VITE_OG_TITLE=${VITE_OG_TITLE}

ARG VITE_OG_DESCRIPTION="읽고 사유하고 쓰고, 다시 돌아와 연결을 만드는 공간 쉘하우스입니다. 이곳에는 그 과정 자체의 즐거움을 함께 체험할 수 있는 따뜻한 사람들이 모입니다."
ENV VITE_OG_DESCRIPTION=${VITE_OG_DESCRIPTION}

ARG VITE_OG_IMAGE_PATH=/쉘하우스.png
ENV VITE_OG_IMAGE_PATH=${VITE_OG_IMAGE_PATH}

# 이미지 전체 URL(CDN 등). 비우면 SITE_URL + VITE_OG_IMAGE_PATH
ARG VITE_OG_IMAGE_URL=${VITE_SITE_URL} + ${VITE_OG_IMAGE_PATH}
ENV VITE_OG_IMAGE_URL=${VITE_OG_IMAGE_URL}

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
