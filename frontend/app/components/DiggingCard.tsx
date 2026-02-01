import { useMemo, useState } from 'react';

interface DiggingCardProps {
  id: string;
  url: string;
  title?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  createdAt: string;
  username?: string;
  onDelete?: (id: string) => void;
  showUser?: boolean;
}

// URL에서 도메인 추출
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
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

  if (seconds < 60) return '방금 전';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// YouTube URL인지 확인하고 video ID 추출
function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    // youtube.com/watch?v=VIDEO_ID
    if (hostname === 'youtube.com' && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    // youtube.com/embed/VIDEO_ID
    if (hostname === 'youtube.com' && urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.replace('/embed/', '');
    }

    // youtube.com/shorts/VIDEO_ID
    if (hostname === 'youtube.com' && urlObj.pathname.startsWith('/shorts/')) {
      return urlObj.pathname.replace('/shorts/', '');
    }

    return null;
  } catch {
    return null;
  }
}

// YouTube Embed 컴포넌트 (Lazy Loading - 클릭 시 로드)
function YouTubeEmbed({
  videoId,
  title,
  thumbnail,
}: {
  videoId: string;
  title?: string;
  thumbnail?: string | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  // DB 썸네일 우선, 없으면 YouTube 썸네일
  const youtubeThumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const fallbackThumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const thumbnailUrl = thumbnail || youtubeThumbnailUrl;

  if (isPlaying) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
        style={{ paddingBottom: '56.25%' }}
      >
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allowFullScreen
          title={title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsPlaying(true)}
      className="relative w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 group cursor-pointer"
      style={{ paddingBottom: '56.25%' }}
      aria-label={`Play ${title || 'YouTube video'}`}
    >
      <img
        src={thumbnailUrl}
        alt={title || 'YouTube video thumbnail'}
        className="absolute top-0 left-0 w-full h-full object-cover"
        onError={(e) => {
          // DB 썸네일이나 maxresdefault가 없으면 hqdefault로 fallback
          if (e.currentTarget.src !== fallbackThumbnailUrl) {
            e.currentTarget.src = fallbackThumbnailUrl;
          }
        }}
      />
      {/* Play 버튼 오버레이 - Sage Green */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
          style={{ backgroundColor: '#9CAF88' }}
        >
          <svg
            className="w-8 h-8 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// 일반 URL 프리뷰 박스 컴포넌트 (OG 스타일)
function LinkPreview({
  url,
  title,
  description,
  thumbnail,
}: {
  url: string;
  title?: string | null;
  description?: string | null;
  thumbnail?: string | null;
}) {
  const domain = extractDomain(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:border-purple-300 dark:hover:border-purple-500 transition-colors"
    >
      {thumbnail && (
        <div className="relative w-full bg-gray-100 dark:bg-gray-700">
          <img
            src={thumbnail}
            alt={title || 'Link preview'}
            className="w-full h-48 object-cover"
            onError={(e) => {
              // 이미지 로딩 실패 시 숨김
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span>{domain}</span>
        </div>
        {title && (
          <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
            {title}
          </h4>
        )}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </a>
  );
}

export default function DiggingCard({
  id,
  url,
  title,
  description,
  thumbnail,
  createdAt,
  username,
  onDelete,
  showUser = false,
}: DiggingCardProps) {
  const youtubeVideoId = useMemo(() => getYouTubeVideoId(url), [url]);
  const domain = extractDomain(url);

  return (
    <article className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            {showUser && username && (
              <>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {username}
                </span>
                <span>·</span>
              </>
            )}
            <span>{timeAgo(createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {domain}
            </span>
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1"
                title="삭제"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Title (제목이 YouTube가 아닐 때만 상단에 표시) */}
        {!youtubeVideoId && title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
        )}

        {/* Description */}
        {description && (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
            {description}
          </p>
        )}

        {/* Content Area - YouTube or Link Preview */}
        {youtubeVideoId ? (
          <YouTubeEmbed
            videoId={youtubeVideoId}
            title={title || undefined}
            thumbnail={thumbnail}
          />
        ) : (
          <LinkPreview
            url={url}
            title={title}
            description={null} // description은 이미 위에서 표시
            thumbnail={thumbnail}
          />
        )}
      </div>
    </article>
  );
}
