import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/events";
import { getEvents, type EventData } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 이벤트" },
    { name: "description", content: "이벤트 신청하기" },
  ];
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    const loadEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [navigate]);

  const handleApply = (eventId: string) => {
    // 신청 확인 페이지로 이동
    navigate(`/events/${eventId}/apply`);
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
                이벤트
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              이벤트를 불러오는 중입니다...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              등록된 이벤트가 없습니다.
            </div>
          ) : (
            events.map((event) => {
              const maxParticipants =
                event.maxParticipants ?? event.capacity ?? 0;
              const currentParticipants = event.applications?.length ?? 0;
              return (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-green-600 text-white rounded-lg flex flex-col items-center justify-center">
                        <div className="text-xs">
                          {event.date
                            ? new Date(event.date).toLocaleDateString("ko-KR", {
                                month: "short",
                              })
                            : "-"}
                        </div>
                        <div className="text-2xl font-bold">
                          {event.date ? new Date(event.date).getDate() : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {event.title}
                      </h2>
                      {event.content && (
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {event.content}
                        </p>
                      )}
                      <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
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
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>{event.location || "장소 미정"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
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
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <span>
                            {currentParticipants}/{maxParticipants || "-"}명 참가
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6">
                  <button
                    onClick={() => handleApply(event.id)}
                    className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    신청하기
                  </button>
                </div>
              </div>
            </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
