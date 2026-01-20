import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import type { Route } from "./+types/auth.callback";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 로그인 완료" },
    { name: "description", content: "로그인이 완료되었습니다." },
  ];
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const userStr = searchParams.get("user");
  const error = searchParams.get("error");

  useEffect(() => {
    if (token && userStr) {
      try {
        // 토큰과 사용자 정보를 localStorage에 저장
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", userStr);
        
        // 대시보드로 이동
        const timer = setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error("Failed to save auth data:", err);
      }
    }
  }, [token, userStr, navigate]);

  const user = userStr ? JSON.parse(userStr) : null;

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
              로그인 실패
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error === "no_code"
                ? "인증 코드를 받지 못했습니다."
                : "인증에 실패했습니다."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-[#8B9D83] text-white rounded-lg hover:bg-[#6B7C63] transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (token && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7f3e9] to-[#faf8f3] dark:from-gray-800 dark:to-gray-700">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-green-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              로그인 성공!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              환영합니다, {user.username}님!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              역할:{" "}
              {user.role === "ADMIN"
                ? "관리자"
                : user.isTerras
                  ? "🌿 테라스 멤버"
                  : user.role === "MEMBER"
                    ? "멤버"
                    : "방문자"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              대시보드로 이동합니다...
            </p>
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
            로그인 처리 중...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            잠시만 기다려주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
