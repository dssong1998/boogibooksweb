import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/boogi-out';
import {
  formatDateTime,
  getBoogiOutList,
  getMe,
  getMyBoogiOutCertificates,
  type BoogiOutCertificateRow,
  type BoogiOutListItem,
} from '../lib/api';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '부기북스 - 부깃아웃' },
    { name: 'description', content: '부깃아웃 모임 목록' },
  ];
}

const statusLabel: Record<string, string> = {
  STANDBY: '준비 중',
  IN_PROGRESS: '모집 중',
  CLOSED_REGISTRATION: '모집 완료',
  COMPLETED: '종료',
  CANCELLED: '취소',
};

type TabId = 'list' | 'certificates';

export default function BoogiOutListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('list');
  const [items, setItems] = useState<BoogiOutListItem[]>([]);
  const [certificates, setCertificates] = useState<BoogiOutCertificateRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [loggedInMember, setLoggedInMember] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBoogiOutList();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== 'certificates') return;
    setCertError(null);
    (async () => {
      setCertLoading(true);
      try {
        const me = await getMe().catch(() => null);
        if (!me || me.role === 'VISITOR') {
          setLoggedInMember(false);
          setCertificates([]);
          return;
        }
        setLoggedInMember(true);
        const data = await getMyBoogiOutCertificates();
        setCertificates(Array.isArray(data) ? data : []);
      } catch (e) {
        setCertError(
          e instanceof Error ? e.message : '증명 목록을 불러오지 못했습니다.',
        );
        setCertificates([]);
      } finally {
        setCertLoading(false);
      }
    })();
  }, [tab]);

  return (
    <div className='min-h-screen bg-[#faf8f3] dark:bg-gray-900'>
      <header className='bg-white dark:bg-gray-800 shadow'>
        <div className='max-w-3xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between gap-2 mb-3'>
            <button
              type='button'
              onClick={() => navigate('/dashboard')}
              className='text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shrink-0 text-sm'
            >
              ← 대시보드
            </button>
            <h1 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center flex-1 min-w-0 truncate px-2'>
              부깃아웃
            </h1>
            <button
              type='button'
              onClick={() => navigate('/boogi-out/create')}
              className='text-sm font-medium text-teal-700 dark:text-teal-400 shrink-0'
            >
              기획하기
            </button>
          </div>
          <nav
            className='flex rounded-xl bg-gray-100 dark:bg-gray-900/80 p-1 gap-1'
            aria-label='부깃아웃 구역'
          >
            <button
              type='button'
              role='tab'
              aria-selected={tab === 'list'}
              onClick={() => setTab('list')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'list'
                  ? 'bg-white dark:bg-gray-800 text-teal-800 dark:text-teal-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              모집 목록
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={tab === 'certificates'}
              onClick={() => setTab('certificates')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'certificates'
                  ? 'bg-white dark:bg-gray-800 text-teal-800 dark:text-teal-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              경험 인증서
            </button>
          </nav>
        </div>
      </header>

      <main className='max-w-3xl mx-auto px-4 py-8 space-y-4'>
        {tab === 'list' && (
          <>
            {loading ? (
              <p className='text-center text-gray-500'>불러오는 중…</p>
            ) : items.length === 0 ? (
              <p className='text-center text-gray-500'>
                등록된 부깃아웃이 없습니다. 직접 기획해 보세요.
              </p>
            ) : (
              items.map((ev) => (
                <button
                  key={ev.id}
                  type='button'
                  onClick={() => navigate(`/boogi-out/${ev.id}`)}
                  className='w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow p-5 hover:shadow-md transition-shadow border border-transparent hover:border-teal-200 dark:hover:border-teal-800'
                >
                  <div className='flex gap-4'>
                    {ev.promotionalImageUrl ? (
                      <img
                        src={ev.promotionalImageUrl}
                        alt=''
                        className='w-20 h-20 rounded-lg object-cover flex-shrink-0'
                      />
                    ) : (
                      <div className='w-20 h-20 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-2xl flex-shrink-0'>
                        🎉
                      </div>
                    )}
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'>
                          {statusLabel[ev.status] ?? ev.status}
                        </span>
                        <span className='text-xs text-gray-500'>
                          {ev._count.applications}명 신청
                        </span>
                      </div>
                      <h2 className='font-bold text-gray-900 dark:text-white mt-1 truncate'>
                        {ev.title}
                      </h2>
                      <p className='text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1'>
                        {ev.description}
                      </p>
                      <p className='text-xs text-gray-500 mt-2'>
                        📍 {ev.location}
                        {ev.eventDate && (
                          <>
                            {' · '}
                            {new Date(ev.eventDate).toLocaleString('ko-KR')}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </>
        )}

        {tab === 'certificates' && (
          <>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              결제를 완료한 부깃아웃만 표시됩니다. 각 항목에서 참석 증명 카드를
              열 수 있습니다.
            </p>
            {certLoading ? (
              <p className='text-center text-gray-500 py-8'>불러오는 중…</p>
            ) : loggedInMember === false ? (
              <div className='text-center py-10 px-4 rounded-xl bg-white dark:bg-gray-800 shadow'>
                <p className='text-gray-600 dark:text-gray-400'>
                  부기 멤버로 로그인하면 참가 증명 목록을 볼 수 있습니다.
                </p>
                <button
                  type='button'
                  onClick={() => {
                    window.location.href = '/auth/discord';
                  }}
                  className='mt-4 text-teal-700 dark:text-teal-400 font-medium'
                >
                  디스코드로 로그인
                </button>
              </div>
            ) : certError ? (
              <p className='text-center text-red-600 dark:text-red-400 py-6'>
                {certError}
              </p>
            ) : certificates.length === 0 ? (
              <p className='text-center text-gray-500 py-10'>
                아직 결제 완료한 부깃아웃이 없습니다.
              </p>
            ) : (
              <ul className='space-y-3'>
                {certificates.map((c) => (
                  <li
                    key={`${c.eventId}-${c.proofToken}`}
                    className='bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden'
                  >
                    <div className='p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300'>
                            {statusLabel[c.eventStatus] ?? c.eventStatus}
                          </span>
                          {c.paidAt && (
                            <span className='text-xs text-gray-500'>
                              결제 {formatDateTime(c.paidAt)}
                            </span>
                          )}
                        </div>
                        <h2 className='font-bold text-gray-900 dark:text-white mt-1'>
                          {c.eventTitle}
                        </h2>
                        <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                          📍 {c.location}
                          {c.eventDate && (
                            <>
                              {' · '}
                              {formatDateTime(c.eventDate)}
                            </>
                          )}
                        </p>
                      </div>
                      <button
                        type='button'
                        onClick={() =>
                          navigate(
                            `/boogi-out/${c.eventId}/proof/${c.proofToken}`,
                          )
                        }
                        className='shrink-0 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium'
                      >
                        증명서 보기
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
