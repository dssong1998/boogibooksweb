import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/payment";
import {
  confirmBoogiOutPayment,
  confirmEventPayment,
  getMe,
  getPaymentTarget,
  getUserById,
  type PaymentKindParam,
  type PaymentTarget,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 결제" },
    { name: "description", content: "이벤트 참가비 결제" },
  ];
}

const BANK_INFO = {
  bank: "KB국민은행",
  bankEncoded: "KB%EA%B5%AD%EB%AF%BC%EC%9D%80%ED%96%89",
  account: "943202-00-285775",
  accountNo: "94320200285775",
  holder: "송대석",
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const rawKind = searchParams.get("paymentKind");
  const paymentKind: PaymentKindParam | null = (() => {
    if (!rawKind?.trim()) return "EVENT";
    const u = rawKind.trim().toUpperCase();
    if (u === "EVENT" || u === "BOOGI_OUT") return u;
    return null;
  })();
  const userIdParam = searchParams.get("userId");

  const [target, setTarget] = useState<PaymentTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [userName, setUserName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      setIsLoading(true);
      try {
        if (!eventId) {
          setLoadError("eventId가 없습니다.");
          setIsLoading(false);
          return;
        }
        if (paymentKind === null) {
          setLoadError(
            "paymentKind이 올바르지 않습니다. EVENT 또는 BOOGI_OUT 이어야 합니다.",
          );
          setIsLoading(false);
          return;
        }

        let me: { id: string; username: string } | null = null;
        try {
          me = await getMe();
        } catch {
          setLoadError("로그인이 필요합니다.");
          setIsLoading(false);
          return;
        }

        if (userIdParam && me.id !== userIdParam) {
          setLoadError("이 결제 링크는 다른 계정용입니다. 해당 계정으로 로그인해 주세요.");
          setIsLoading(false);
          return;
        }

        if (userIdParam) {
          try {
            const u = await getUserById(userIdParam);
            setUserName(u.username);
            setCurrentUserId(u.id);
          } catch {
            setUserName(me.username);
            setCurrentUserId(me.id);
          }
        } else {
          setUserName(me.username);
          setCurrentUserId(me.id);
        }

        const t = await getPaymentTarget(eventId, paymentKind);
        setTarget(t);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "정보를 불러오지 못했습니다.");
        setTarget(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [eventId, paymentKind, userIdParam]);

  const price = target?.amount ?? 0;
  const isConfirmed =
    target?.paymentKind === "EVENT" && target.applicationStatus === "CONFIRMED";
  const isPaid =
    target?.paymentKind === "EVENT" && target.applicationStatus === "PAID";

  const useCommissionBank =
    target?.paymentKind === "BOOGI_OUT" &&
    target.settlementMode === "COMMISSION" &&
    Boolean(target.commissionBankName?.trim()) &&
    Boolean(target.commissionAccountNumber?.trim());

  const bankDisplay = useCommissionBank
    ? {
        bank: target!.commissionBankName!.trim(),
        account: target!.commissionAccountNumber!.trim(),
        accountNo: digitsOnly(target!.commissionAccountNumber!),
        holder: "기획자 안내 계좌",
      }
    : BANK_INFO;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("ko-KR").format(amount);

  const eventTypeLabel = () => {
    if (!target) return "—";
    if (target.paymentKind === "BOOGI_OUT") return "부깃아웃";
    switch (target.eventType) {
      case "MEETING":
        return "대면모임";
      case "DIGGING_CLUB":
        return "디깅클럽";
      case "ONLINE":
        return "온라인";
      case "OTHER":
        return "기타";
      default:
        return "이벤트";
    }
  };

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(bankDisplay.account);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getTossDeepLink = (amount: number) => {
    return `supertoss://send?amount=${amount}&bank=${useCommissionBank ? encodeURIComponent(bankDisplay.bank) : BANK_INFO.bankEncoded}&accountNo=${bankDisplay.accountNo}&origin=qr`;
  };

  const handleTossPayment = async () => {
    if (!eventId || !currentUserId || !target) {
      alert("결제 정보가 올바르지 않습니다.");
      return;
    }
    if (isConfirmed) {
      alert("이미 참가가 확정되었습니다. 추가 결제는 할 수 없습니다.");
      return;
    }

    setIsConfirming(true);
    try {
      const skipEventPaidConfirm =
        target.paymentKind === "EVENT" && isPaid;
      if (!skipEventPaidConfirm) {
        if (target.paymentKind === "BOOGI_OUT") {
          await confirmBoogiOutPayment(eventId);
        } else {
          await confirmEventPayment(
            eventId,
            userIdParam ? currentUserId : undefined,
          );
        }
      }

      window.location.href = getTossDeepLink(price);

      setTimeout(() => {
        alert("신청이 완료되었습니다! 토스앱에서 송금을 진행해주세요.");
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      alert(
        error instanceof Error ? error.message : "신청 처리에 실패했습니다.",
      );
      setIsConfirming(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!eventId || !currentUserId || !target) {
      alert("결제 정보가 올바르지 않습니다.");
      return;
    }
    if (isConfirmed) {
      alert("이미 참가가 확정되었습니다. 추가 결제는 할 수 없습니다.");
      return;
    }

    setIsConfirming(true);
    try {
      if (target.paymentKind === "BOOGI_OUT") {
        await confirmBoogiOutPayment(eventId);
      } else {
        await confirmEventPayment(eventId, userIdParam ? currentUserId : undefined);
      }
      alert("송금 확인 요청이 완료되었습니다. 확인 후 참가가 확정됩니다.");
      navigate("/");
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      alert(
        error instanceof Error ? error.message : "확인 요청에 실패했습니다.",
      );
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

  if (loadError || !target) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-[#faf8f3] dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300 text-center">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate("/events")}
          className="text-teal-700 underline"
        >
          이벤트 목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              type="button"
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {target.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {target.paymentKind === "BOOGI_OUT"
                ? "부깃아웃 · 서버에서 산정한 금액입니다."
                : "일반 이벤트 · 서버에서 산정한 금액입니다."}
            </p>
          </div>

          <div className="mb-8 p-6 bg-sage-50 dark:bg-sage-900/20 rounded-lg border border-sage-200 dark:border-sage-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-700 dark:text-gray-300">구분</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {eventTypeLabel()}
              </span>
            </div>
            {target.paymentKind === "BOOGI_OUT" &&
              target.settlementMode === "COIN_GAIN" && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  정산 방식: 코인 획득 — 아래 계좌는 송금 안내가 없을 때 공용 안내용입니다.
                </p>
              )}
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 text-lg">
                참가비
              </span>
              <span className="text-3xl font-bold text-sage-700 dark:text-sage-400">
                {formatPrice(price)}원
              </span>
            </div>
          </div>

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
                  {bankDisplay.bank}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">계좌번호</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-medium text-gray-900 dark:text-white">
                    {bankDisplay.account}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyAccount()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {isCopied ? "복사됨!" : "복사"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">예금주</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {bankDisplay.holder}
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

          <div className="mb-6">
            {(isConfirmed || isPaid) && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  {isConfirmed
                    ? "✅ 이미 참가가 확정된 상태입니다. 결제는 다시 진행할 수 없습니다."
                    : "💸 이미 입금 확인 요청이 접수된 상태입니다. 중복하여 결제하지 않도록 주의해주세요."}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleTossPayment()}
              disabled={isConfirming || isConfirmed}
              className="w-full px-6 py-5 bg-[#0064FF] text-white rounded-xl hover:bg-[#0052D4] transition-colors font-bold text-xl disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg"
            >
              {isConfirming ? (
                <span>처리 중...</span>
              ) : (
                <>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span>토스로 {formatPrice(price)}원 결제하기</span>
                </>
              )}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              {isPaid
                ? "버튼을 누르면 토스앱만 열립니다. (이미 입금 확인 요청된 경우 DB는 변경되지 않습니다)"
                : "버튼을 누르면 토스앱이 열리고 결제 완료 처리가 진행됩니다"}
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

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handleConfirmPayment()}
              disabled={isConfirming || isConfirmed}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isConfirming ? "처리 중..." : "직접 송금 완료"}
            </button>
            <button
              type="button"
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
