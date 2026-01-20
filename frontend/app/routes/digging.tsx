import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/digging";
import { deleteDigging, getDiggings, type DiggingData } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 디깅박스" },
    { name: "description", content: "나의 디깅 목록" },
  ];
}

export default function Digging() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DiggingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    const loadDiggings = async () => {
      try {
        const data = await getDiggings();
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load diggings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDiggings();
  }, [navigate]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDigging(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete digging:", error);
    }
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
                디깅박스
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              디깅 목록을 불러오는 중입니다...
            </p>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <svg
              className="w-16 h-16 text-purple-600 mx-auto mb-4"
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              디깅 목록이 비어있습니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              관심 있는 링크와 내용을 디깅해보세요
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              대시보드로 돌아가기
            </button>
          </div>
        ) : (
          /* Digging List */
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {item.url}
                    </a>
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                      {item.description}
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="ml-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
      </main>
    </div>
  );
}
