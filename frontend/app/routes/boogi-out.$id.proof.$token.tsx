import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/boogi-out.$id.proof.$token";
import { formatDateTime, getBoogiOutProofPublic } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [{ title: "부깃아웃 참석 증명" }];
}

export default function BoogiOutProofPage() {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    eventTitle: string;
    location: string;
    eventDate: string | null;
    username: string;
    paidAt: string | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    void getBoogiOutProofPublic(id, token)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"));
  }, [id, token]);

  if (err) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <p className="text-red-600 dark:text-red-400 text-center">{err}</p>
        <button
          type="button"
          className="mt-4 text-teal-700"
          onClick={() => navigate("/")}
        >
          홈으로
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f3] dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-teal-200/50 dark:border-gray-600">
        <div className="bg-teal-600 text-white text-center py-6 px-4">
          <div className="text-4xl mb-2">✓</div>
          <h1 className="text-lg font-bold">부깃아웃 참석</h1>
          <p className="text-teal-100 text-sm mt-1">결제 완료 · 참석 증명</p>
        </div>
        <div className="p-6 space-y-4 text-center">
          <p className="text-xs uppercase tracking-wider text-gray-500">이벤트</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {data.eventTitle}
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {data.eventDate && <p>{formatDateTime(data.eventDate)}</p>}
            <p>📍 {data.location}</p>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500">참가자</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.username}
            </p>
            {data.paidAt && (
              <p className="text-xs text-gray-500 mt-2">
                확인 시각: {formatDateTime(data.paidAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
