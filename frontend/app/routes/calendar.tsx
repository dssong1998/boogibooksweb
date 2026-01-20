import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/calendar";
import {
  getEvents,
  getMonthSchedules,
  type EventData,
  type ScheduleData,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 일정 캘린더" },
    { name: "description", content: "이번 달 일정을 확인하세요" },
  ];
}

type CalendarItem = {
  id: string;
  title: string;
  date: Date;
  type: "event" | "schedule";
  scheduleType?: ScheduleData["type"];
};

const scheduleTypeStyles: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  MEETING: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-300",
    label: "모임",
  },
  SHELLCAST: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    label: "쉘캐스트",
  },
  DIGGING_CLUB: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
    label: "디깅클럽",
  },
  MOVIE_NIGHT: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-800 dark:text-rose-300",
    label: "무비나잇",
  },
  BOOGITOUT: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-800 dark:text-emerald-300",
    label: "부깃아웃",
  },
};

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
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
        console.error("Failed to load calendar data:", error);
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

  const itemsByDay = useMemo(() => {
    const map = new Map<number, CalendarItem[]>();

    // Add events
    events.forEach((event) => {
      if (!event.date) return;
      const date = new Date(event.date);
      if (
        date.getFullYear() === currentDate.getFullYear() &&
        date.getMonth() === currentDate.getMonth()
      ) {
        const day = date.getDate();
        const items = map.get(day) || [];
        items.push({
          id: event.id,
          title: event.title,
          date,
          type: "event",
        });
        map.set(day, items);
      }
    });

    // Add schedules
    schedules.forEach((schedule) => {
      if (!schedule.date) return;
      const date = new Date(schedule.date);
      if (
        date.getFullYear() === currentDate.getFullYear() &&
        date.getMonth() === currentDate.getMonth()
      ) {
        const day = date.getDate();
        const items = map.get(day) || [];
        items.push({
          id: schedule.id,
          title: schedule.title,
          date,
          type: "schedule",
          scheduleType: schedule.type,
        });
        map.set(day, items);
      }
    });

    return map;
  }, [events, schedules, currentDate]);

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const getItemStyle = (item: CalendarItem) => {
    if (item.type === "event") {
      return {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-800 dark:text-green-300",
      };
    }
    const style = scheduleTypeStyles[item.scheduleType || "MEETING"];
    return style || scheduleTypeStyles.MEETING;
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                일정 캘린더
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          )}

          {/* Calendar Grid */}
          {!isLoading && (
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
                <div
                  key={day}
                  className={`text-center py-2 font-semibold ${
                    index === 0
                      ? "text-red-600 dark:text-red-400"
                      : index === 6
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();

                const dayItems = itemsByDay.get(day) || [];

                return (
                  <div
                    key={day}
                    className={`min-h-[80px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isToday
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500"
                        : ""
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        isToday
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {day}
                    </div>
                    {/* 일정 표시 */}
                    {dayItems.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayItems.slice(0, 3).map((item) => {
                          const style = getItemStyle(item);
                          return (
                            <div
                              key={item.id}
                              className={`text-xs px-1 rounded truncate ${style.bg} ${style.text}`}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                          );
                        })}
                        {dayItems.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{dayItems.length - 3}개 더
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-500 rounded"></div>
              <span>오늘</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <span>이벤트</span>
            </div>
            {Object.entries(scheduleTypeStyles).map(([key, style]) => (
              <div key={key} className="flex items-center space-x-2">
                <div className={`w-4 h-4 ${style.bg} rounded`}></div>
                <span>{style.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
