import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/calendar';
import {
  getEvents,
  getMonthSchedules,
  type EventData,
  type ScheduleData,
} from '../lib/api';
import { CalendarSticker } from '../components/CalendarSticker';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '부기북스 - 일정 캘린더' },
    { name: 'description', content: '이번 달 일정을 확인하세요' },
  ];
}

export type CalendarItem = {
  id: string;
  title: string;
  date: Date;
  type: 'event' | 'schedule';
  scheduleType?: ScheduleData['type'];
};

const scheduleTypeStyles: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  MEETING: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-800 dark:text-indigo-300',
    label: '모임',
  },
  SHELLCAST: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    label: '쉘캐스트',
  },
  DIGGING_CLUB: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
    label: '디깅클럽',
  },
  MOVIE_NIGHT: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-800 dark:text-rose-300',
    label: '무비나잇',
  },
  BOOGITOUT: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    label: '부깃아웃',
  },
};

type ViewMode = 'month' | 'week' | 'day';

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<EventData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stickerDate, setStickerDate] = useState<Date | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const [eventsData, schedulesData] = await Promise.all([
          getEvents(),
          getMonthSchedules(year, month),
        ]);

        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      } catch (error) {
        console.error('Failed to load calendar data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const itemsByDay = useMemo(() => {
    const map = new Map<number, CalendarItem[]>();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const add = (date: Date, item: CalendarItem) => {
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      const day = date.getDate();
      const items = map.get(day) || [];
      items.push(item);
      map.set(day, items);
    };

    events.forEach((event) => {
      if (!event.date) return;
      const date = new Date(event.date);
      add(date, {
        id: event.id,
        title: event.title,
        date,
        type: 'event',
      });
    });
    schedules.forEach((schedule) => {
      if (!schedule.date) return;
      const date = new Date(schedule.date);
      add(date, {
        id: schedule.id,
        title: schedule.title,
        date,
        type: 'schedule',
        scheduleType: schedule.type,
      });
    });
    return map;
  }, [events, schedules, currentDate]);

  const itemsByDateStr = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const add = (date: Date, item: CalendarItem) => {
      const key = toDateKey(date);
      const items = map.get(key) || [];
      items.push(item);
      map.set(key, items);
    };
    events.forEach((event) => {
      if (!event.date) return;
      const date = new Date(event.date);
      add(date, { id: event.id, title: event.title, date, type: 'event' });
    });
    schedules.forEach((schedule) => {
      if (!schedule.date) return;
      const date = new Date(schedule.date);
      add(date, {
        id: schedule.id,
        title: schedule.title,
        date,
        type: 'schedule',
        scheduleType: schedule.type,
      });
    });
    return map;
  }, [events, schedules]);

  const getItemsForDate = (d: Date) => itemsByDateStr.get(toDateKey(d)) ?? [];

  const weekStart = (d: Date) => {
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  };

  const weekDays = useMemo(() => {
    const start = weekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const goPrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const goNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const monthNames = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ];

  const getItemStyle = (item: CalendarItem) => {
    if (item.type === 'event') {
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
      };
    }
    const style = scheduleTypeStyles[item.scheduleType || 'MEETING'];
    return style || scheduleTypeStyles.MEETING;
  };

  return (
    <div className='min-h-screen bg-[#faf8f3] dark:bg-gray-900'>
      {/* Header */}
      <header className='bg-white dark:bg-gray-800 shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/dashboard')}
                className='text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
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
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                일정 캘린더
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - full width, no box */}
      <main className='w-full px-0 pt-0 pb-4'>
        {/* View mode: Apple Calendar style segmented control */}
        <div className='flex rounded-none bg-white dark:bg-gray-800 p-1 mx-0 mb-4 border-gray-100 dark:border-gray-700 border-t-1'>
          {(['month', 'week', 'day'] as const).map((mode, index) => (
            <button
              key={mode}
              type='button'
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                index === 2
                  ? 'border-r-0 rounded-r-md'
                  : 'border-r-1 border-gray-100 dark:border-gray-700'
              } ${index === 0 ? 'rounded-l-md' : 'rounded-none'} ${
                viewMode === mode
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {mode === 'month' ? '월' : mode === 'week' ? '주' : '일'}
            </button>
          ))}
        </div>

        {/* Nav + Title */}
        <div className='flex items-center justify-between mb-4 px-4'>
          <button
            onClick={goPrev}
            className='p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation'
            aria-label='이전'
          >
            <svg
              className='w-6 h-6 text-gray-600 dark:text-gray-300'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>
          <h2 className='text-lg sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums'>
            {viewMode === 'month' &&
              `${currentDate.getFullYear()}년 ${monthNames[currentDate.getMonth()]}`}
            {viewMode === 'week' &&
              (() => {
                const start = weekDays[0];
                const end = weekDays[6];
                const sameMonth = start.getMonth() === end.getMonth();
                if (sameMonth)
                  return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getDate()}일`;
                return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
              })()}
            {viewMode === 'day' &&
              `${currentDate.getFullYear()}년 ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}일`}
          </h2>
          <button
            onClick={goNext}
            className='p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation'
            aria-label='다음'
          >
            <svg
              className='w-6 h-6 text-gray-600 dark:text-gray-300'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto' />
          </div>
        )}

        {!isLoading && viewMode === 'month' && (
          <>
            <div className='grid grid-cols-7 gap-0'>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div
                  key={day}
                  className={`text-center py-1.5 sm:py-2 text-xs sm:text-base font-semibold border-b border-gray-200 dark:border-gray-700 ${
                    index === 0
                      ? 'text-red-600 dark:text-red-400 border-r'
                      : index === 6
                        ? 'text-blue-600 dark:text-blue-400 border-r-0'
                        : 'text-gray-700 dark:text-gray-300 border-r'
                  }`}
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className='aspect-square min-h-[44px] sm:min-h-[56px] border-b border-r border-gray-200 dark:border-gray-700'
                />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                const dayItems = itemsByDay.get(day) || [];
                const dayDate = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );

                return (
                  <button
                    key={day}
                    type='button'
                    onClick={() => {
                      if (dayItems.length > 0) setStickerDate(dayDate);
                    }}
                    className={`aspect-square min-h-[44px] sm:min-h-[56px] p-0 flex flex-col items-center justify-start transition-colors touch-manipulation border-b border-r border-gray-200 dark:border-gray-700 ${
                      day % 7 === 0
                        ? 'border-r-0'
                        : 'border-r' && isToday
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span
                      className={`text-sm sm:text-base font-medium ${
                        isToday
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {day}
                    </span>
                    {/* 월간: 점으로만 표시 (Apple Calendar 스타일) */}
                    {dayItems.length > 0 && (
                      <div className='flex flex-wrap justify-center mt-0.5 sm:mt-1'>
                        {dayItems.slice(0, 5).map((item) => {
                          const style = getItemStyle(item);
                          return (
                            <span
                              key={item.id}
                              className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${style.bg} ${style.text} border border-current/30`}
                              title={item.title}
                            />
                          );
                        })}
                        {dayItems.length > 5 && (
                          <span className='text-[10px] text-gray-500 dark:text-gray-400'>
                            +{dayItems.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className='mt-4 flex flex-wrap items-center justify-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-4'>
              <span className='flex items-center ml-4 first:ml-0'>
                <span className='w-2 h-2 rounded-full bg-indigo-500 mr-1.5' />
                오늘
              </span>
              <span className='flex items-center ml-4'>
                <span className='w-2 h-2 rounded-full bg-green-500/80 mr-1.5' />
                이벤트
              </span>
              {Object.entries(scheduleTypeStyles)
                .slice(0, 3)
                .map(([key, style]) => (
                  <span key={key} className='flex items-center ml-4 first:ml-0'>
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${style.bg} ${style.text} border border-current/30`}
                    />
                    {style.label}
                  </span>
                ))}
            </div>
          </>
        )}

        {!isLoading && viewMode === 'week' && (
          <div className='px-4 space-y-3'>
            {weekDays.map((d) => {
              const items = getItemsForDate(d);
              const isToday = toDateKey(d) === toDateKey(new Date());
              return (
                <div
                  key={d.getTime()}
                  className={`rounded-xl border p-3 ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                    {d.getMonth() + 1}월 {d.getDate()}일 (
                    {['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})
                  </div>
                  {items.length === 0 ? (
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      일정 없음
                    </p>
                  ) : (
                    <ul className='space-y-1.5'>
                      {items.map((item) => {
                        const style = getItemStyle(item);
                        return (
                          <li
                            key={item.id}
                            className={`text-sm px-2 py-1.5 rounded-lg truncate ${style.bg} ${style.text}`}
                          >
                            {item.title}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && viewMode === 'day' && (
          <div className='px-4 py-4'>
            <ul className='space-y-2'>
              {getItemsForDate(currentDate).length === 0 ? (
                <li className='text-gray-500 dark:text-gray-400 text-sm'>
                  이 날 일정이 없습니다.
                </li>
              ) : (
                getItemsForDate(currentDate).map((item) => {
                  const style = getItemStyle(item);
                  return (
                    <li
                      key={item.id}
                      className={`px-3 py-2.5 rounded-xl ${style.bg} ${style.text}`}
                    >
                      <span className='font-medium'>{item.title}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </main>

      {stickerDate && (
        <CalendarSticker
          date={stickerDate}
          items={getItemsForDate(stickerDate)}
          onClose={() => setStickerDate(null)}
          onEventClick={(item) => {
            setStickerDate(null);
            if (item.type === 'event') navigate(`/events/${item.id}/apply`);
          }}
        />
      )}
    </div>
  );
}
