import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/digging.explore";
import {
  getPublicDiggings,
  type DiggingPublic,
  type DiggingPublicResponse,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 디깅박스 탐험" },
    { name: "description", content: "모두의 디깅을 탐험하세요" },
  ];
}

// URL에서 도메인 추출
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch {
    return url;
  }
}

// 시간 경과 표시
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "방금 전";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export default function DiggingExplore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [diggings, setDiggings] = useState<DiggingPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(
    searchParams.get("hashtag")
  );
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 모든 해시태그 수집
  const allHashtags = Array.from(
    new Set(diggings.flatMap((d) => d.hashtags))
  ).slice(0, 20);

  const loadDiggings = useCallback(
    async (pageNum: number, hashtag: string | null, reset = false) => {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response: DiggingPublicResponse = await getPublicDiggings(
          pageNum,
          20,
          hashtag || undefined
        );

        if (reset) {
          setDiggings(response.data);
        } else {
          setDiggings((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.pagination.hasMore);
        setPage(pageNum);
      } catch (error) {
        console.error("Failed to load diggings:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  // 초기 로드 및 해시태그 변경 시
  useEffect(() => {
    loadDiggings(1, selectedHashtag, true);
  }, [selectedHashtag, loadDiggings]);

  // Intersection Observer 설정 (무한 스크롤)
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadDiggings(page + 1, selectedHashtag, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, isLoading, page, selectedHashtag, loadDiggings]);

  const handleHashtagClick = (hashtag: string | null) => {
    setSelectedHashtag(hashtag);
    if (hashtag) {
      setSearchParams({ hashtag });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔍 디깅박스 탐험
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  모두가 공유한 인사이트를 둘러보세요
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/digging")}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              내 디깅 보기 →
            </button>
          </div>
        </div>
      </header>

      {/* Hashtag Filter */}
      {allHashtags.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleHashtagClick(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                !selectedHashtag
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-gray-600"
              }`}
            >
              전체
            </button>
            {allHashtags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleHashtagClick(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedHashtag === tag
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-gray-600"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
        ) : diggings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">🔍</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedHashtag
                ? `#${selectedHashtag} 태그의 디깅이 없습니다`
                : "아직 디깅이 없습니다"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              디스코드 디깅박스에서 링크를 공유해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {diggings.map((digging) => (
              <article
                key={digging.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                <a
                  href={digging.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {digging.user.username}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(digging.createdAt)}</span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {extractDomain(digging.url)}
                    </span>
                  </div>

                  {/* Title */}
                  {digging.title && (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {digging.title}
                    </h3>
                  )}

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                    {digging.description}
                  </p>

                  {/* Hashtags */}
                  {digging.hashtags && digging.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {digging.hashtags.map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.preventDefault();
                            handleHashtagClick(tag);
                          }}
                          className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 cursor-pointer transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* URL Preview */}
                  <div className="mt-4 text-sm text-purple-600 dark:text-purple-400 truncate group-hover:underline">
                    {digging.url}
                  </div>
                </a>
              </article>
            ))}

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="py-4">
              {isLoadingMore && (
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>더 불러오는 중...</span>
                  </div>
                </div>
              )}
              {!hasMore && diggings.length > 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                  모든 디깅을 불러왔습니다 ✨
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
