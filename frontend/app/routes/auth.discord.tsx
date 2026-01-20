import { useEffect, useState } from "react";
import axios from "axios";
import type { Route } from "./+types/auth.discord";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - Discord 로그인" },
    { name: "description", content: "Discord로 로그인하고 있습니다..." },
  ];
}

export default function AuthDiscord() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscordAuthUrl = async () => {
      try {
        const apiBaseUrl =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        console.log("Fetching Discord auth URL from:", `${apiBaseUrl}/auth/discord/url`);
        const response = await axios.get<{ url: string }>(
          `${apiBaseUrl}/auth/discord/url`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        console.log("Received URL:", response.data.url);
        window.location.href = response.data.url;
      } catch (err) {
        console.error("Failed to get Discord auth URL:", err);
        if (axios.isAxiosError(err)) {
          console.error("Error details:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
            url: err.config?.url,
          });
          setError(
            `Discord 로그인 URL을 가져오는데 실패했습니다: ${err.response?.status || err.message}`
          );
        } else {
          setError("Discord 로그인 URL을 가져오는데 실패했습니다.");
        }
      }
    };

    fetchDiscordAuthUrl();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7f3e9] to-[#faf8f3] dark:from-gray-800 dark:to-gray-700">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              오류 발생
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-2 bg-[#8B9D83] text-white rounded-lg hover:bg-[#6B7C63] transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7f3e9] to-[#faf8f3] dark:from-gray-800 dark:to-gray-700">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Discord 로그인 중...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Discord 인증 페이지로 이동하고 있습니다.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            잠시만 기다려주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
