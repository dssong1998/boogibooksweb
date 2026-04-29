import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { absoluteUrlForPublicAsset } from "./lib/shareMeta";
import "./app.css";

export function meta({}: Route.MetaArgs) {
  const title =
    import.meta.env.VITE_OG_TITLE?.trim() || "부기북스";
  return [{ title }];
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const title = import.meta.env.VITE_OG_TITLE?.trim() || "부기북스";
  const description =
    import.meta.env.VITE_OG_DESCRIPTION?.trim() ||
    "읽고 사유하고 쓰고, 다시 돌아와 연결을 만드는 공간 쉘하우스입니다. 이곳에는 그 과정 자체의 즐거움을 함께 체험할 수 있는 따뜻한 사람들이 모입니다.";

  const origin = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const imageUrlOverride = import.meta.env.VITE_OG_IMAGE_URL?.trim();
  const imagePath = import.meta.env.VITE_OG_IMAGE_PATH?.trim() || "/쉘하우스.png";
  // origin이 비어 있는 로컬 개발 환경에서도 head에 og:image가 보이도록 상대 경로라도 넣습니다.
  // (실제 공유 미리보기는 절대 URL이 필요하므로 운영에서는 VITE_SITE_URL을 반드시 설정하세요.)
  const encodedPath =
    "/" +
    (imagePath.startsWith("/") ? imagePath.slice(1) : imagePath)
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");
  const ogImage =
    imageUrlOverride ||
    (origin ? absoluteUrlForPublicAsset(origin, imagePath) : encodedPath);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        {/* React 19 head hoisting: 링크 미리보기(Open Graph/Twitter) 메타를 직접 렌더링 */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {origin ? <meta property="og:site_name" content={title} /> : null}
        <meta property="og:locale" content="ko_KR" />
        {ogImage ? (
          <>
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:alt" content={title} />
          </>
        ) : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
        <meta name="description" content={description} />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
