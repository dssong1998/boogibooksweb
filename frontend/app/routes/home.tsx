import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 랜딩 페이지" },
    { name: "description", content: "부기북스에 오신 것을 환영합니다!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();

  // 토큰이 있으면 대시보드로 리다이렉트
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const words = [
    "나를",
    "정보를",
    "뉴스를",
    "타인을",
    "컨텐츠를",
    "세상을",
    "감정을",
    "그림을",
    "영화를",
    "도전을",
    "데이터를",
    "서사를",
    "경험을",
    "꿈을",
    "태도를",
    "책을",
  ];

  const [object, setObject] = useState(words[0]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= words.length - 1) return;
    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        if (prevIndex < words.length - 1) {
          return prevIndex + 1;
        }
        return prevIndex;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [index]);

  useEffect(() => {
    setObject(words[index]);
  }, [index]);



  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-[3] flex flex-col items-center justify-center gap-10 bg-gradient-to-br from-[#f7f3e9] to-[#faf8f3] dark:from-gray-800 dark:to-gray-700 px-4 py-16">
        <div className="flex justify-center mb-10">
          <img src="/logo.png" alt="부기북스 로고" width={90}/>
        </div>
        <div className="max-w-4xl mx-auto text-start">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            부기는
          </h1>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {object}
          </h1>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            읽습니다
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          더이상 언젠가를 위해 쌓아만두지 말고 직접 경험해서 남겨두세요.
          부기와 함께,
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                window.location.href = '/auth/discord';
              }}
              className="px-6 py-3 bg-[#8B9D83] text-white rounded-lg hover:bg-[#6B7C63] transition-colors"
            >
              멤버 입장
            </button>
            <button className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              About 부기
            </button>
          </div>
        </div>
      </div>
      <div className="flex-[2] flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 px-4 py-16">
        <div className="max-w-6xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            부기는 이런 분들을 위해 만들어졌어요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 책 아이콘 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-amber-600 dark:text-amber-400"
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
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
                책을 읽어도 기억이 안 나요
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                독서를 하나의 경험으로 만들어 오래도록 남겨보세요
              </p>
            </div>

            {/* 사람들 아이콘 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
                다른 사람들의 생각이 궁금해요
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                서로 다른 사람들과 생각을 공유하며 확장해보세요
              </p>
            </div>

            {/* 대화 아이콘 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
                의미있는 대화가 필요해요
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                지적인 자극과 흥미로운 아이디어 등 무언가 남는 대화의 장에 참여해보세요
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* 신규 가입 유도 배너 */}
      <div className="bg-[#9CAF88] dark:bg-[#6B8E5A] py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-white text-base md:text-lg font-medium">
              여러분의 첫번째 발견을 부기에서 경험하세요
            </p>
          </div>
          <button
            onClick={() => {
              const apiBaseUrl =
                import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
              window.location.href = `${apiBaseUrl}/auth/discord`;
            }}
            className="px-6 py-2 bg-white text-[#9CAF88] dark:bg-gray-100 dark:text-[#6B8E5A] rounded-lg font-semibold text-sm md:text-base hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            가입하기
          </button>
        </div>
      </div>
    </div>
  );
}
