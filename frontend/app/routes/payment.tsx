import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/payment";
import { confirmEventPayment, getEvent, getUserById, getMe, type EventData } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 결제" },
    { name: "description", content: "이벤트 참가비 결제" },
  ];
}

// 계좌 정보 (환경 변수로 관리하는 것이 좋음)
const BANK_INFO = {
  bank: "KB국민은행",
  bankEncoded: "KB%EA%B5%AD%EB%AF%BC%EC%9D%80%ED%96%89", // URL 인코딩된 은행명
  account: "943202-00-285775",
  accountNo: "94320200285775", // 토스 딥링크용 (하이픈 제거)
  holder: "송대석",
};

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const applicationOrder = searchParams.get("applicationOrder");
  const userId = searchParams.get("userId"); // URL 파라미터로 userId 받기

  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [userName, setUserName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // userId가 URL에 있으면 getUserById 사용, 없으면 getMe() 사용
      if (userId) {
        try {
          const userData = await getUserById(userId);
          setUserName(userData.username);
          setCurrentUserId(userData.id);
        } catch (error) {
          console.error("Failed to load user by id:", error);
        }
      } else {
        try {
          const userData = await getMe();
          if (userData) {
            setUserName(userData.username);
            setCurrentUserId(userData.id);
          }
        } catch (error) {
          console.error("Failed to load current user:", error);
        }
      }

      // 이벤트 정보 로드
      if (eventId) {
        try {
          const data = await getEvent(eventId);
          setEvent(data);
        } catch (error) {
          console.error("Failed to load event:", error);
        }
      }
      
      setIsLoading(false);
    };

    loadData();
  }, [eventId, userId]);

  // 이벤트 타입에 따른 가격
  const getPrice = () => {
    if (!event) return 0;
    // 백엔드에서 price가 있으면 사용, 없으면 eventType으로 판단
    if (event.price) return event.price;
    switch (event.eventType) {
      case "MEETING":
        return 30000;
      case "DIGGING_CLUB":
        return 15000;
      default:
        return 0;
    }
  };

  const price = getPrice();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.account);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // 토스앱 딥링크 생성
  const getTossDeepLink = (amount: number) => {
    return `supertoss://send?amount=${amount}&bank=${BANK_INFO.bankEncoded}&accountNo=${BANK_INFO.accountNo}&origin=qr`;
  };

  // 토스 결제 버튼 클릭 - 결제 완료 처리 후 토스앱 열기
  const handleTossPayment = async () => {
    if (!eventId || !currentUserId) {
      alert("결제 정보가 올바르지 않습니다.");
      return;
    }

    setIsConfirming(true);
    try {
      // 먼저 결제 완료 처리 (userId를 body로 전달)
      await confirmEventPayment(eventId, currentUserId);
      
      // 토스앱 열기
      window.location.href = getTossDeepLink(price);
      
      // 잠시 후 이벤트 페이지로 이동 (토스앱이 열리지 않는 경우 대비)
      setTimeout(() => {
        alert("신청이 완료되었습니다! 토스앱에서 송금을 진행해주세요.");
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      alert("신청 처리에 실패했습니다. 다시 시도해주세요.");
      setIsConfirming(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!eventId || !currentUserId) {
      alert("결제 정보가 올바르지 않습니다.");
      return;
    }

    setIsConfirming(true);
    try {
      await confirmEventPayment(eventId, currentUserId);
      alert("송금 확인 요청이 완료되었습니다. 확인 후 참가가 확정됩니다.");
      navigate("/");
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      alert("확인 요청에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
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
              참가비 결제
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {/* Event Info */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {event?.title || "이벤트"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              신청 순번: {applicationOrder}번
            </p>
          </div>

          {/* Price Info */}
          <div className="mb-8 p-6 bg-sage-50 dark:bg-sage-900/20 rounded-lg border border-sage-200 dark:border-sage-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-700 dark:text-gray-300">
                이벤트 유형
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {event?.eventType === "MEETING"
                  ? "대면모임"
                  : event?.eventType === "DIGGING_CLUB"
                    ? "디깅클럽"
                    : "기타"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 text-lg">
                참가비
              </span>
              <span className="text-3xl font-bold text-sage-700 dark:text-sage-400">
                {formatPrice(price)}원
              </span>
            </div>
          </div>

          {/* Bank Transfer Info */}
          <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              계좌 송금 안내
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">은행</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {BANK_INFO.bank}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">계좌번호</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-medium text-gray-900 dark:text-white">
                    {BANK_INFO.account}
                  </span>
                  <button
                    onClick={handleCopyAccount}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {isCopied ? "복사됨!" : "복사"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">예금주</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {BANK_INFO.holder}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="text-gray-600 dark:text-gray-400">입금자명</span>
                <span className="font-medium text-blue-700 dark:text-blue-400">
                  {userName || "본인 이름"}
                </span>
              </div>
            </div>
          </div>

          {/* Toss Payment Button */}
          <div className="mb-6">
            <button
              onClick={handleTossPayment}
              disabled={isConfirming}
              className="w-full px-6 py-5 bg-[#0064FF] text-white rounded-xl hover:bg-[#0052D4] transition-colors font-bold text-xl disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg"
            >
              {isConfirming ? (
                <span>처리 중...</span>
              ) : (
                <>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>토스로 {formatPrice(price)}원 결제하기</span>
                </>
              )}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              버튼을 누르면 토스앱이 열리고 신청이 완료됩니다
            </p>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                또는 직접 송금
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
              📌 직접 송금 시 안내
            </h4>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <li>
                • 입금자명은 <strong>{userName || "본인 이름"}</strong>으로 해주세요.
              </li>
              <li>• 송금 후 아래 &quot;직접 송금 완료&quot; 버튼을 눌러주세요.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirmPayment}
              disabled={isConfirming}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isConfirming ? "처리 중..." : "직접 송금 완료"}
            </button>
            <button
              onClick={() => navigate("/events")}
              className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              나중에 결제하기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
