import type { MetaDescriptor } from "react-router";

const DEFAULT_OG_TITLE = "부기북스";
const DEFAULT_OG_DESCRIPTION =
  "책과 사람이 만나는 자리, 부기북스. 모임·서재·디깅클럽 등 함께 읽고 나누는 공간입니다.";

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

  let ogImage: string | undefined = imageUrlOverride;
  if (!ogImage && origin) {
    try {
      const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
      ogImage = new URL(path, `${origin}/`).href;
    } catch {
      ogImage = undefined;
    }
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
