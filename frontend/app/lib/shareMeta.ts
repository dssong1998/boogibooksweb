import type { MetaDescriptor } from "react-router";

const DEFAULT_OG_TITLE = "부기북스";
/** 로컬 실행 시 — Docker / compose 기본 설명과 동일 */
const DEFAULT_OG_DESCRIPTION =
  "읽고 사유하고 쓰고, 다시 돌아와 연결을 만드는 공간 쉘하우스입니다. 이곳에는 그 과정 자체의 즐거움을 함께 체험할 수 있는 따뜻한 사람들이 모입니다.";

/** public 정적 파일(한글 파일명 포함)의 절대 URL — 일부 크롤러는 경로 UTF-8 인코딩을 요구합니다 */
export function absoluteUrlForPublicAsset(
  origin: string,
  pathname: string,
): string {
  const base = origin.replace(/\/$/, "");
  const raw = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const encodedPath =
    "/" +
    raw
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  return `${base}${encodedPath}`;
}

/** 링크 복사 시 카카오·슬랙·디스코드 등 미리보기용 — `VITE_OG_*` / `VITE_SITE_URL` 로 수정 */
export function buildOpenGraphMeta(): MetaDescriptor[] {
  const origin = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const title =
    import.meta.env.VITE_OG_TITLE?.trim() || DEFAULT_OG_TITLE;
  const description =
    import.meta.env.VITE_OG_DESCRIPTION?.trim() || DEFAULT_OG_DESCRIPTION;

  const imageUrlOverride = import.meta.env.VITE_OG_IMAGE_URL?.trim();
  const imagePath =
    import.meta.env.VITE_OG_IMAGE_PATH?.trim() || "/쉘하우스.png";

  let ogImage: string | undefined;
  if (imageUrlOverride) {
    ogImage = imageUrlOverride;
  } else if (origin) {
    ogImage = absoluteUrlForPublicAsset(origin, imagePath);
  }

  const tags: MetaDescriptor[] = [
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "description", content: description },
  ];

  if (ogImage) {
    tags.push(
      { property: "og:image", content: ogImage },
      { property: "og:image:alt", content: title },
      { name: "twitter:image", content: ogImage },
    );
  }

  if (origin) {
    tags.push({ property: "og:site_name", content: title });
    tags.push({ property: "og:locale", content: "ko_KR" });
  }

  return tags;
}
