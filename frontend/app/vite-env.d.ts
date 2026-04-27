/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** 공개 사이트 원본 (https://boogibooks.com) — og:image 절대 URL에 필요 */
  readonly VITE_SITE_URL?: string;
  /** 링크 미리보기 제목 (미설정 시 기본 문구) */
  readonly VITE_OG_TITLE?: string;
  /** 링크 미리보기 설명 */
  readonly VITE_OG_DESCRIPTION?: string;
  /** 큰 카드 이미지 전체 URL (CDN 등). 비우면 SITE_URL + VITE_OG_IMAGE_PATH */
  readonly VITE_OG_IMAGE_URL?: string;
  /** public 기준 경로 (기본 /쉘하우스.png) */
  readonly VITE_OG_IMAGE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
