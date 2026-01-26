import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/dashboard";
import {
  createDigging,
  getBooks,
  getDiggings,
  getEvents,
  getWeekSchedules,
  getCurrentMonthlyBooks,
  getMyTableLogStats,
  getMe,
  type UserData,
  type BookData,
  type DiggingData,
  type EventData,
  type ScheduleData,
  type MonthlyBookData,
  type TableLogStats,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 대시보드" },
    { name: "description", content: "나의 독서 공간" },
  ];
}



interface WeeklyScheduleItem {
  id: string;
  title: string;
  date: string;
  label?: string;
  type?: "event" | "schedule";
  scheduleType?: ScheduleData["type"];
}

const scheduleTypeLabels: Record<string, { label: string; color: string }> = {
  MEETING: { label: "모임", color: "indigo" },
  SHELLCAST: { label: "쉘캐스트", color: "amber" },
  DIGGING_CLUB: { label: "디깅클럽", color: "purple" },
  MOVIE_NIGHT: { label: "무비나잇", color: "rose" },
  BOOGITOUT: { label: "부깃아웃", color: "emerald" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [showDiggingModal, setShowDiggingModal] = useState(false);
  const [diggingUrl, setDiggingUrl] = useState("");
  const [diggingDescription, setDiggingDescription] = useState("");
  const [books, setBooks] = useState<BookData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [diggings, setDiggings] = useState<DiggingData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [monthlyBooks, setMonthlyBooks] = useState<MonthlyBookData[]>([]);
  const [tableLogStats, setTableLogStats] = useState<TableLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      navigate("/");
      return;
    }

  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    const loadDashboard = async () => {
      console.log("Dashboard loading started...");
      try {
        const results = await Promise.all([
          getBooks().catch((e) => { console.error("getBooks failed:", e); return []; }),
          getEvents().catch((e) => { console.error("getEvents failed:", e); return []; }),
          getDiggings().catch((e) => { console.error("getDiggings failed:", e); return []; }),
          getWeekSchedules().catch((e) => { console.error("getWeekSchedules failed:", e); return []; }),
          getCurrentMonthlyBooks().catch((e) => { console.error("getCurrentMonthlyBooks failed:", e); return []; }),
          getMyTableLogStats().catch((e) => { console.error("getMyTableLogStats failed:", e); return null; }),
          getMe().catch((e) => { console.error("getMe failed:", e); return null; }),
        ]);
        console.log("Dashboard API results:", results);
        
        const [booksData, eventsData, diggingsData, schedulesData, monthlyBooksData, tableLogData, userData] = results;
        setBooks(Array.isArray(booksData) ? booksData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setDiggings(Array.isArray(diggingsData) ? diggingsData : []);
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
        setMonthlyBooks(Array.isArray(monthlyBooksData) ? monthlyBooksData : []);
        setTableLogStats(tableLogData);
        setUser(userData);
        console.log("Dashboard data set successfully");
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setIsLoading(false);
        console.log("Dashboard loading finished");
      }
    };

    loadDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAddDigging = async () => {
    try {
      const created = await createDigging({
        url: diggingUrl,
        description: diggingDescription,
      });
      setDiggings((prev) => [created, ...prev]);
      setShowDiggingModal(false);
      setDiggingUrl("");
      setDiggingDescription("");
    } catch (error) {
      console.error("Failed to add digging:", error);
    }
  };

  const upcomingEvent = useMemo(() => {
    const datedEvents = events
      .filter((event) => event.date)
      .sort(
        (a, b) =>
          new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
      );
    return datedEvents[0];
  }, [events]);

  const recentDigging = useMemo(() => {
    const sorted = [...diggings].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
    return sorted[0];
  }, [diggings]);

  const weeklySchedule = useMemo<WeeklyScheduleItem[]>(() => {
    const now = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(now.getDate() + 7);

    // Events
    const eventItems: WeeklyScheduleItem[] = events
      .filter((event) => event.date)
      .filter((event) => {
        const eventDate = new Date(event.date as string);
        return eventDate >= now && eventDate <= weekEnd;
      })
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date as string,
        label: "이벤트",
        type: "event" as const,
      }));

    // Schedules (이미 이번 주 데이터만 불러옴)
    const scheduleItems: WeeklyScheduleItem[] = schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      date: schedule.date,
      label: scheduleTypeLabels[schedule.type]?.label || schedule.type,
      type: "schedule" as const,
      scheduleType: schedule.type,
    }));

    // Combine and sort
    return [...eventItems, ...scheduleItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [events, schedules]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              부기북스
            </h1>
            <div className="flex items-center space-x-4">
              {user?.role === "ADMIN" && (
                <button
                  onClick={() => navigate("/admin")}
                  className="px-4 py-2 text-sm bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium"
                >
                  관리자
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            프로필
          </h2>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8B9D83] to-[#6B7C63] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {user.username}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user.role === "ADMIN"
                    ? "관리자"
                    : user.isTerras
                      ? "🌿 테라스 멤버"
                      : user.role === "MEMBER"
                        ? "멤버"
                        : "방문자"}
                </p>
                {user.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {user.totalBooksRead ?? books.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  읽은 책
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {user.diggingsCount ?? diggings.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  디깅박스
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {user.eventsParticipated ?? 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  참여 이벤트
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {tableLogStats?.totalDays ?? 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  식탁 참여
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  이번 달 식탁
                </span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {tableLogStats?.monthlyStats?.[0]?.count ?? 0}회
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  총 식탁 참여
                </span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {tableLogStats?.totalLogs ?? 0}회
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  보유 코인
                </span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  💰 {user.coins ?? 0} 코인
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 이번 주 일정 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <svg
                className="w-8 h-8 text-[#8B9D83]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white ml-3">
                이번 주 일정
              </h2>
            </div>
            <button
              onClick={() => navigate("/calendar")}
              className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
            >
              전체 일정 보기 →
            </button>
          </div>
          <div className="space-y-3">
            {weeklySchedule.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                이번 주 일정이 없습니다.
              </div>
            ) : (
              weeklySchedule.map((item) => {
                const date = new Date(item.date);
                const dayLabel = date.toLocaleDateString("ko-KR", {
                  weekday: "short",
                });
                
                // 색상 결정
                const getTagStyle = () => {
                  if (item.type === "event") {
                    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
                  }
                  const typeInfo = item.scheduleType ? scheduleTypeLabels[item.scheduleType] : null;
                  if (typeInfo) {
                    const colorMap: Record<string, string> = {
                      indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
                      amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                      purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
                      rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
                      emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
                    };
                    return colorMap[typeInfo.color] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
                  }
                  return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
                };

                return (
                  <div
                    key={item.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dayLabel}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {date.toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagStyle()}`}>
                      {item.label ?? "일정"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Grid Layout for Dashboard Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 이달의 책 */}
          <section
            onClick={() => navigate("/monthly-book")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow min-h-[280px] flex flex-col cursor-pointer"
          >
            <div className="flex items-center mb-2">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                이달의 책
              </h2>
            </div>
            {/* 이달의 주제 */}
            {monthlyBooks.length > 0 && monthlyBooks[0].topic && (
              <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300 text-center font-medium">
                  📖 이달의 주제: {monthlyBooks[0].topic}
                </p>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center justify-center">
              {monthlyBooks.length > 0 ? (
                <div className="w-full">
                  {monthlyBooks.length === 1 ? (
                    // 1권일 때
                    <div className="text-center">
                      <div className="mb-3">
                        <img
                          src={monthlyBooks[0].coverUrl || ""}
                          alt={monthlyBooks[0].title}
                          className="w-28 h-40 object-cover rounded-lg shadow-md mx-auto"
                        />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                        {monthlyBooks[0].title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {monthlyBooks[0].author}
                      </p>
                    </div>
                  ) : (
                    // 여러 권일 때
                    <div className="flex justify-center gap-3 overflow-x-auto pb-2">
                      {monthlyBooks.slice(0, 3).map((book) => (
                        <div key={book.id} className="flex-shrink-0 text-center w-24">
                          <img
                            src={book.coverUrl || ""}
                            alt={book.title}
                            className="w-20 h-28 object-cover rounded-lg shadow-md mx-auto mb-2"
                          />
                          <h3 className="font-bold text-gray-900 dark:text-white text-xs truncate">
                            {book.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {book.author}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {monthlyBooks.length > 3 && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                      +{monthlyBooks.length - 3}권 더보기
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  아직 선정된 책이 없습니다
                </p>
              )}
            </div>
          </section>

          {/* 이벤트 */}
          <section
            onClick={() => navigate("/events")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow min-h-[280px] flex flex-col cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <svg
                className="w-8 h-8 text-[#8B9D83]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                이벤트
              </h2>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {upcomingEvent ? (
                <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">
                            {upcomingEvent.date
                              ? new Date(upcomingEvent.date).getDate()
                              : "-"}
                          </div>
                        </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {upcomingEvent.title}
                        </h3>
                        {upcomingEvent.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {upcomingEvent.content}
                          </p>
                        )}
                        {upcomingEvent.date && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {new Date(upcomingEvent.date).toLocaleDateString(
                              "ko-KR",
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  진행 중인 이벤트가 없습니다
                </p>
              )}
            </div>
          </section>

          {/* 디깅박스 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow min-h-[280px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                  디깅박스
                </h2>
              </div>
              <button
                onClick={() => navigate("/digging")}
                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
              >
                더보기 →
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              {recentDigging ? (
                <div className="space-y-3">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <a
                      href={recentDigging.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline line-clamp-1"
                    >
                      {recentDigging.url}
                    </a>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {recentDigging.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDiggingModal(true)}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    + 디깅 추가하기
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                    아직 디깅 내역이 없습니다
                  </p>
                  <button
                    onClick={() => setShowDiggingModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    + 디깅 추가하기
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 서재 - Gallery Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white ml-3">
                서재
              </h2>
            </div>
            <button
              onClick={() => navigate("/books/add")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + 책 추가하기
            </button>
          </div>

          {/* 서재 책 목록 또는 Empty State */}
          {books.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                서재가 비어있습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                첫 번째 책을 추가하여 나만의 서재를 만들어보세요
              </p>
              <button
                onClick={() => navigate("/books/add")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                첫 책 추가하기
              </button>
            </div>
          ) : (
            /* Gallery Grid - 책 목록 표시 */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {books.map((book) => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/books/${book.id}`)}
                  className="group relative aspect-[2/3] rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <img
                    src={book.coverUrl || ""}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="text-white font-medium text-sm line-clamp-2">
                        {book.title}
                      </h4>
                      <p className="text-gray-300 text-xs mt-1">
                        {book.author}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 디깅 추가 모달 */}
      {showDiggingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                디깅 추가하기
              </h3>
              <button
                onClick={() => setShowDiggingModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={diggingUrl}
                  onChange={(e) => setDiggingUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  설명
                </label>
                <textarea
                  id="description"
                  value={diggingDescription}
                  onChange={(e) => setDiggingDescription(e.target.value)}
                  placeholder="간단한 설명을 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowDiggingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAddDigging}
                  disabled={!diggingUrl || !diggingDescription}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
