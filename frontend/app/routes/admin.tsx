import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/admin";
import {
  getAdminEvents,
  deleteAdminEvent,
  getAdminMonthlyBooks,
  deleteAdminMonthlyBook,
  getAdminSchedules,
  deleteAdminSchedule,
  getEventApplications,
  approveEventApplications,
  getMe,
  type EventData,
  type MonthlyBookData,
  type ScheduleData,
  type EventApplicationData,
  type UserData,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 관리자" },
    { name: "description", content: "관리자 대시보드" },
  ];
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "books" | "calendar">(
    "events"
  );

  const [events, setEvents] = useState<EventData[]>([]);
  const [monthlyBooks, setMonthlyBooks] = useState<MonthlyBookData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 신청자 목록 모달
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");
  const [selectedEventMax, setSelectedEventMax] = useState<number>(0);
  const [applications, setApplications] = useState<EventApplicationData[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [isApproving, setIsApproving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    const loadUser = async () => {
      try {
        const userData = await getMe();
        if (!userData || userData.role !== "ADMIN") {
          navigate("/dashboard");
          return;
        }
        setUser(userData);
      } catch {
        navigate("/");
      }
    };

    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === "events") {
          const data = await getAdminEvents();
          setEvents(data);
        } else if (activeTab === "books") {
          const data = await getAdminMonthlyBooks();
          setMonthlyBooks(data);
        } else if (activeTab === "calendar") {
          const data = await getAdminSchedules();
          setSchedules(data);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, activeTab]);

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("정말 이 이벤트를 삭제하시겠습니까?")) return;
    try {
      await deleteAdminEvent(id);
      setEvents(events.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("이벤트 삭제에 실패했습니다.");
    }
  };

  const handleDeleteMonthlyBook = async (id: string) => {
    if (!confirm("정말 이 이달의 책을 삭제하시겠습니까?")) return;
    try {
      await deleteAdminMonthlyBook(id);
      setMonthlyBooks(monthlyBooks.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete monthly book:", error);
      alert("이달의 책 삭제에 실패했습니다.");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("정말 이 일정을 삭제하시겠습니까?")) return;
    try {
      await deleteAdminSchedule(id);
      setSchedules(schedules.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      alert("일정 삭제에 실패했습니다.");
    }
  };

  const handleViewApplications = async (eventId: string, eventTitle: string, maxParticipants: number) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setSelectedEventMax(maxParticipants);
    setShowApplicationsModal(true);
    setLoadingApplications(true);
    setSelectedApplications(new Set());
    
    try {
      const data = await getEventApplications(eventId);
      setApplications(data);
    } catch (error) {
      console.error("Failed to load applications:", error);
      alert("신청자 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleToggleApplication = (appId: string) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  const handleSelectAllPending = () => {
    const pendingApps = applications.filter(a => a.status === "PENDING");
    const allSelected = pendingApps.every(a => selectedApplications.has(a.id));
    
    if (allSelected) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(pendingApps.map(a => a.id)));
    }
  };

  const handleApprove = async () => {
    if (!selectedEventId || selectedApplications.size === 0) return;
    
    if (!confirm(`선택한 ${selectedApplications.size}명의 신청을 승인하시겠습니까?\n승인 시 Discord DM으로 결제 안내가 전송됩니다.`)) {
      return;
    }
    
    setIsApproving(true);
    try {
      const result = await approveEventApplications(
        selectedEventId,
        Array.from(selectedApplications),
      );
      
      let message = `${result.approved}명이 승인되었습니다.`;
      if (result.coinRefunded.length > 0) {
        message += `\n\n🪙 ${result.coinRefunded.length}명에게 코인이 반환되었습니다.`;
      }
      if (result.dmSent > 0) {
        message += `\n\n📬 ${result.dmSent}명에게 결제 안내 DM이 전송되었습니다.`;
      }
      
      alert(message);
      
      // 목록 새로고침
      const data = await getEventApplications(selectedEventId);
      setApplications(data);
      setSelectedApplications(new Set());
    } catch (error) {
      console.error("Failed to approve applications:", error);
      alert("승인에 실패했습니다.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleFinalizeApproval = async () => {
    if (!selectedEventId) return;

    const pendingOrCoin = applications.filter(
      (a) => a.status === "PENDING" || a.status === "COIN_GUARANTEED",
    );
    if (pendingOrCoin.length === 0) {
      alert("승인 대기 또는 코인 보장 상태인 신청자가 없습니다.");
      return;
    }

    if (
      !confirm(
        `신청을 마감합니다.\n\n승인 대기·코인 보장 중인 ${pendingOrCoin.length}명에게 거절 안내 DM이 전송되고, 코인 사용 신청은 코인이 환불됩니다.\n\n계속하시겠습니까?`,
      )
    ) {
      return;
    }

    setIsFinalizing(true);
    try {
      const result = await approveEventApplications(selectedEventId, [], {
        finalizeApproval: true,
      });
      let message = "신청 마감 처리가 완료되었습니다.";
      if (result.rejectedCount != null && result.rejectedCount > 0) {
        message += `\n\n거절 안내 DM: ${result.rejectedCount}명`;
      }
      if (result.coinRefunded?.length) {
        message += `\n\n코인 환불: ${result.coinRefunded.length}명`;
      }
      alert(message);
      const data = await getEventApplications(selectedEventId);
      setApplications(data);
      setSelectedApplications(new Set());
    } catch (error) {
      console.error("Failed to finalize approval:", error);
      alert("신청 마감 처리에 실패했습니다.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return { text: "승인대기", color: "amber" };
      case "APPROVED": return { text: "승인됨(결제대기)", color: "blue" };
      case "CONFIRMED": return { text: "확정", color: "green" };
      case "COIN_GUARANTEED": return { text: "코인확정", color: "purple" };
      case "CANCELLED": return { text: "취소", color: "red" };
      default: return { text: status, color: "gray" };
    }
  };

  const scheduleTypeLabels: Record<string, { label: string; color: string }> = {
    MEETING: { label: "모임", color: "indigo" },
    SHELLCAST: { label: "쉘캐스트", color: "amber" },
    DIGGING_CLUB: { label: "디깅클럽", color: "purple" },
    MOVIE_NIGHT: { label: "무비나잇", color: "rose" },
    BOOGITOUT: { label: "부깃아웃", color: "emerald" },
  };

  if (!user) {
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
                관리자 대시보드
              </h1>
            </div>
            <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm font-medium">
              관리자
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "events"
                  ? "border-green-600 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              이벤트 관리
            </button>
            <button
              onClick={() => setActiveTab("books")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "books"
                  ? "border-amber-600 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              이달의 책 관리
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "calendar"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              일정 관리
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "events" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                이벤트 관리
              </h2>
              <button
                onClick={() => navigate("/admin/events/create")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + 새 이벤트 추가
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400 text-center py-8">
                등록된 이벤트가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.date
                          ? new Date(event.date).toLocaleDateString("ko-KR")
                          : "-"}{" "}
                        | {event.location || "장소 미정"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        참가자: {event.applications?.length || 0} / {event.maxParticipants || "-"}명
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewApplications(event.id, event.title, event.maxParticipants || 0)}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        신청자 관리
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <svg
                          className="w-5 h-5"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "books" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                이달의 책 관리
              </h2>
              <button
                onClick={() => navigate("/admin/monthly-book/create")}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                + 이달의 책 설정
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              </div>
            ) : monthlyBooks.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400 text-center py-8">
                등록된 이달의 책이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {book.coverUrl && (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {book.year}년 {book.month}월
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {book.title} - {book.author}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMonthlyBook(book.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <svg
                        className="w-5 h-5"
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                일정 관리
              </h2>
              <button
                onClick={() => navigate("/admin/calendar/create")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                + 새 일정 추가
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400 text-center py-8">
                등록된 일정이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => {
                  const typeInfo = scheduleTypeLabels[schedule.type] || {
                    label: schedule.type,
                    color: "gray",
                  };
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            typeInfo.color === "indigo"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : typeInfo.color === "amber"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : typeInfo.color === "purple"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              : typeInfo.color === "rose"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                              : typeInfo.color === "emerald"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {typeInfo.label}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {schedule.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(schedule.date).toLocaleDateString("ko-KR")}
                            {schedule.time && ` ${schedule.time}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <svg
                          className="w-5 h-5"
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 신청자 관리 모달 */}
      {showApplicationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    신청자 관리 - {selectedEventTitle}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    정원: <span className={applications.length > selectedEventMax ? "text-red-600 font-bold" : ""}>{applications.length}</span> / {selectedEventMax}명
                  </p>
                </div>
                <button
                  onClick={() => setShowApplicationsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 일괄 선택 및 승인 버튼 */}
            {applications.some(a => a.status === "PENDING") && (
              <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applications.filter(a => a.status === "PENDING").every(a => selectedApplications.has(a.id))}
                    onChange={handleSelectAllPending}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-blue-800 dark:text-blue-300">
                    승인대기 전체 선택 ({applications.filter(a => a.status === "PENDING").length}명)
                  </span>
                </label>
                <button
                  onClick={handleApprove}
                  disabled={selectedApplications.size === 0 || isApproving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isApproving ? "승인 중..." : `선택한 ${selectedApplications.size}명 승인하기`}
                </button>
              </div>
            )}

            {applications.some(
              (a) => a.status === "PENDING" || a.status === "COIN_GUARANTEED",
            ) && (
              <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    신청 마감
                  </p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    승인 대기·코인 보장 중인 신청자에게 거절 안내 DM을 보내고 모집을
                    종료합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFinalizeApproval}
                  disabled={isFinalizing || isApproving}
                  className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isFinalizing ? "처리 중..." : "신청 마감 (미승인자 거절)"}
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto max-h-[55vh]">
              {loadingApplications ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  아직 신청자가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => {
                    const statusInfo = getStatusLabel(app.status);
                    const isOverCapacity = app.applicationOrder > selectedEventMax;
                    const isPending = app.status === "PENDING";
                    
                    return (
                      <div
                        key={app.id}
                        className={`flex items-center p-4 rounded-lg border-2 transition-colors ${
                          selectedApplications.has(app.id)
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : isOverCapacity
                              ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
                              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                        }`}
                      >
                        {/* 체크박스 (PENDING만) */}
                        <div className="mr-4">
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={selectedApplications.has(app.id)}
                              onChange={() => handleToggleApplication(app.id)}
                              className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                            />
                          ) : (
                            <div className="w-5 h-5" />
                          )}
                        </div>

                        {/* 순번 */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          isOverCapacity
                            ? "bg-gradient-to-br from-red-500 to-red-700"
                            : "bg-gradient-to-br from-[#8B9D83] to-[#6B7C63]"
                        }`}>
                          {app.applicationOrder}
                        </div>

                        {/* 사용자 정보 */}
                        <div className="flex-1 ml-4">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {app.username}
                            </h4>
                            {app.isTerras && (
                              <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                                🌿 테라스
                              </span>
                            )}
                            {isOverCapacity && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                                정원초과
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            📚 서재활동: {app.libraryMessageCount || 0}개 · {new Date(app.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>

                        {/* 상태 */}
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${
                            statusInfo.color === "green"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : statusInfo.color === "blue"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : statusInfo.color === "amber"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : statusInfo.color === "purple"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : statusInfo.color === "red"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {statusInfo.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>
                  총 {applications.length}명 · 
                  승인대기 {applications.filter(a => a.status === "PENDING").length}명 · 
                  확정 {applications.filter(a => a.status === "CONFIRMED" || a.status === "COIN_GUARANTEED").length}명
                </span>
                <span className="text-xs text-right max-w-xs">
                  ※ 승인 시 결제 안내 DM이 전송됩니다. 모집 종료는 위「신청
                  마감」버튼을 사용하세요.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
