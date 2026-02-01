import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/digging.explore';
import {
  getPublicDiggings,
  type DiggingPublic,
  type DiggingPublicResponse,
} from '../lib/api';
import DiggingCard from '../components/DiggingCard';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '부기북스 - 디깅박스 탐험' },
    { name: 'description', content: '모두의 디깅을 탐험하세요' },
  ];
}

export default function DiggingExplore() {
  const navigate = useNavigate();
  const [diggings, setDiggings] = useState<DiggingPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadDiggings = useCallback(async (pageNum: number, reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response: DiggingPublicResponse = await getPublicDiggings(
        pageNum,
        20,
      );

      if (reset) {
        setDiggings(response.data);
      } else {
        setDiggings((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load diggings:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // 초기 로드 및 해시태그 변경 시
  useEffect(() => {
    loadDiggings(1, true);
  }, [loadDiggings]);

  // Intersection Observer 설정 (무한 스크롤)
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoading
        ) {
          loadDiggings(page + 1, false);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, isLoading, page, loadDiggings]);

  return (
    <div className='min-h-screen bg-gradient-to-b from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800'>
      {/* Header */}
      <header className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow sticky top-0 z-10'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/dashboard')}
                className='text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors'
              >
                <svg
                  className='w-6 h-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                  />
                </svg>
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                  🔍 디깅박스 탐험
                </h1>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  모두가 공유한 인사이트를 둘러보세요
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/digging')}
              className='text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium'
            >
              내 디깅 보기 →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {isLoading ? (
          <div className='space-y-4'>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className='bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 animate-pulse'
              >
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3' />
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2' />
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-full' />
              </div>
            ))}
          </div>
        ) : diggings.length === 0 ? (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center'>
            <span className='text-6xl mb-4 block'>🔍</span>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
              {'아직 디깅이 없습니다'}
            </h2>
            <p className='text-gray-600 dark:text-gray-400'>
              디스코드 디깅박스에서 링크를 공유해보세요!
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {diggings.map((digging) => (
              <DiggingCard
                key={digging.id}
                id={digging.id}
                url={digging.url}
                title={digging.title}
                description={digging.description}
                thumbnail={digging.thumbnail}
                createdAt={digging.createdAt}
                username={digging.user.username}
                showUser={true}
              />
            ))}

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className='py-4'>
              {isLoadingMore && (
                <div className='text-center'>
                  <div className='inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400'>
                    <svg
                      className='animate-spin h-5 w-5'
                      viewBox='0 0 24 24'
                      fill='none'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                      />
                    </svg>
                    <span>더 불러오는 중...</span>
                  </div>
                </div>
              )}
              {!hasMore && diggings.length > 0 && (
                <p className='text-center text-gray-500 dark:text-gray-400 text-sm'>
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
