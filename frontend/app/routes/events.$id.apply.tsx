import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/events.$id.apply";
import {
  applyToEvent,
  checkEventEligibility,
  getEvent,
  type EventData,
  type EventEligibility,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 이벤트 신청" },
    { name: "description", content: "이벤트 신청하기" },
  ];
}

export default function EventApply() {
  const navigate = useNavigate();
  const params = useParams();
  const eventId = params.id;
  const [event, setEvent] = useState<EventData | null>(null);
  const [eligibility, setEligibility] = useState<EventEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCoins, setUseCoins] = useState(false); // 코인 사용 체크박스

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      if (!eventId) return;
      try {
        const [eventData, eligibilityData] = await Promise.all([
          getEvent(eventId),
          checkEventEligibility(eventId),
        ]);
        setEvent(eventData);
        setEligibility(eligibilityData);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [eventId, navigate]);

  const handleApply = async () => {
    if (!eventId || !eligibility) return;

    setIsApplying(true);
    setError(null);

    try {
      const result = await applyToEvent(eventId, useCoins);
      if (result.success) {
        // 테라스 멤버: 바로 신청 완료 → 대시보드로
        if (result.isFree) {
          alert("🎉 " + result.message);
          navigate("/dashboard");
          return;
        }

        // 코인 사용: 정원 외 보장 신청 완료 → 대시보드로
        if (result.status === "COIN_GUARANTEED") {
          alert("🪙 " + result.message);
          navigate("/dashboard");
          return;
        }

        // 일반 신청: 관리자 승인 대기 → 대시보드로
        alert("✅ " + result.message + "\n\n관리자 승인 후 결제 안내 DM을 받으실 수 있습니다.");
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "신청에 실패했습니다.";
      setError(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f3] dark:bg-gray-900">
        <div className="relative">
          {/* 부기 이모지 회전 */}
          <div className="text-6xl animate-bounce mb-4">📚</div>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 animate-pulse">
          부기가 서재의 글을 확인중..
        </p>
      </div>
    );
  }

  const isEligible = eligibility?.eligible ?? false;
  const isOverCapacity = eligibility?.isOverCapacity ?? false;
  const canAffordCoins = (eligibility?.userCoins ?? 0) >= (eligibility?.requiredCoins ?? 0);
  const applicationOrder = eligibility?.currentOrder ?? 0;
  const maxParticipants = eligibility?.maxParticipants ?? 0;
  const requiredCoins = eligibility?.requiredCoins ?? 0;
  const userCoins = eligibility?.userCoins ?? 0;
  const currentParticipants = event?.applications?.length ?? 0;
  const isTerras = eligibility?.isTerras ?? false;
  const isFree = eligibility?.isFree ?? false;
  const eventPrice = eligibility?.price ?? 0;
  const eventType = eligibility?.eventType ?? "";

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "MEETING":
        return "대면모임";
      case "DIGGING_CLUB":
        return "디깅클럽";
      case "ONLINE":
        return "온라인";
      default:
        return "기타";
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
                onClick={() => navigate("/events")}
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
                이벤트 신청
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {event?.title || "이벤트"}
          </h2>

          {/* Event Info */}
          <div className="space-y-4 mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
              <span className="text-gray-700 dark:text-gray-300">
                {event?.date
                  ? new Date(event.date).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "날짜 미정"}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
              </svg>
              <span className="text-gray-700 dark:text-gray-300">
                {event?.location || "장소 미정"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  {getEventTypeLabel(eventType)}
                </span>
              </div>
              <div className="text-right">
                {isFree ? (
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    무료 (테라스 멤버)
                  </span>
                ) : (
                  <span className="text-xl font-bold text-sage-700 dark:text-sage-400">
                    {formatPrice(eventPrice)}원
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Terras Free Banner */}
          {isTerras && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌿</span>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-300">
                    테라스 멤버 혜택
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    모든 이벤트를 무료로 참가하실 수 있습니다!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Eligibility Check */}
          {!isEligible && eligibility?.reason && (
            <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
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
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    신청 불가
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {eligibility.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Application Status */}
          {isEligible && (
            <div className="mb-8">
              <div
                className={`p-6 rounded-lg ${
                  isOverCapacity
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-blue-50 dark:bg-blue-900/20"
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      isOverCapacity
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    <span className="text-xl font-bold">{applicationOrder}</span>
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold mb-1 ${
                        isOverCapacity
                          ? "text-red-800 dark:text-red-300"
                          : "text-blue-800 dark:text-blue-300"
                      }`}
                    >
                      {isOverCapacity
                        ? "⚠️ 정원이 초과되었습니다"
                        : `✓ ${applicationOrder}번째 신청자입니다`}
                    </h3>
                    <p className="text-sm">
                      현재 참가자:{" "}
                      <span className={isOverCapacity ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-700 dark:text-gray-300"}>
                        {currentParticipants}명
                      </span>
                      {" / 정원: "}
                      <span className="text-gray-700 dark:text-gray-300">{maxParticipants}명</span>
                    </p>
                    {isOverCapacity && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        정원 초과 시 관리자 승인 우선순위가 낮아질 수 있습니다.
                        <br />
                        코인을 사용하면 정원 외로 확정 신청이 가능합니다.
                      </p>
                    )}
                    {!isOverCapacity && !isFree && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        신청 후 관리자 승인 시 결제 안내 DM을 받으실 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 서재 활동 정보 */}
          {eligibility && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📚</span>
                <span className="text-gray-700 dark:text-gray-300">
                  이번 달 서재 활동:{" "}
                  <span className="font-semibold">{eligibility.libraryMessageCount ?? 0}개</span>
                </span>
              </div>
            </div>
          )}

          {/* Coin Usage Checkbox (테라스가 아닌 경우에만 표시) */}
          {isEligible && !isFree && (
            <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="useCoins"
                  checked={useCoins}
                  onChange={(e) => setUseCoins(e.target.checked)}
                  disabled={!canAffordCoins}
                  className="mt-1 h-5 w-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label htmlFor="useCoins" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                        🪙 코인 사용하여 정원 외 보장 받기
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        코인을 사용하면 정원과 관계없이 자동으로 참가가 확정됩니다.
                      </p>
                      {useCoins && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ※ 만약 관리자가 정원 내로 승인하면 사용한 코인은 반환됩니다!
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        필요 / 보유
                      </p>
                      <p className="text-xl font-bold text-yellow-800 dark:text-yellow-300">
                        {requiredCoins} / {userCoins}
                      </p>
                    </div>
                  </div>
                  {!canAffordCoins && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-3">
                      ⚠️ 코인이 부족합니다.
                    </p>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => navigate("/events")}
              className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl 
                hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500
                active:bg-gray-200 dark:active:bg-gray-600
                transition-all duration-150 font-medium text-lg"
            >
              취소
            </button>
            {isEligible && (
              <button
                onClick={handleApply}
                disabled={isApplying || (useCoins && !canAffordCoins)}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold text-lg shadow-lg
                  transition-all duration-200 ease-out
                  transform hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl
                  active:scale-[0.98] active:translate-y-0 active:shadow-md
                  ${
                    isFree
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-green-500/30"
                      : useCoins
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 shadow-yellow-500/30"
                        : "bg-gradient-to-r from-[#7c9070] to-[#5a6b52] text-white hover:from-[#6b7f62] hover:to-[#4a5a44] shadow-[#7c9070]/30"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-lg`}
              >
                {isApplying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    신청 중...
                  </span>
                ) : isFree ? (
                  "🌿 무료 신청하기"
                ) : useCoins ? (
                  `🪙 코인 ${requiredCoins}개로 확정 신청`
                ) : (
                  "✨ 신청하기"
                )}
              </button>
            )}
          </div>

          {/* 신청 안내 */}
          {isEligible && !isFree && (
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📋 신청 절차 안내</h4>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>신청 버튼을 눌러 신청합니다.</li>
                <li>관리자가 신청을 검토 후 승인합니다.</li>
                <li>승인 시 Discord DM으로 결제 안내를 받습니다.</li>
                <li>계좌이체 후 참가가 확정됩니다.</li>
              </ol>
              {useCoins && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-3">
                  💡 코인 사용 시 관리자 승인 없이 바로 확정됩니다!
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
