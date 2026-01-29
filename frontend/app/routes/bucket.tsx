import { useState } from "react";

// 계좌 정보 (환경 변수로 관리하는 것이 좋음)
const BANK_INFO = {
  bank: "KB국민은행",
  bankEncoded: "KB%EA%B5%AD%EB%AF%BC%EC%9D%80%ED%96%89", // URL 인코딩된 은행명
  account: "943202-00-285775",
  accountNo: "94320200285775", // 토스 딥링크용 (하이픈 제거)
  holder: "송대석",
};

// 별점별 금액 설정 (인덱스 = 별 개수)
// 별 1개: 0원, 별 2개: 3000원, 별 3개: 5000원, 별 4개: 7000원, 별 5개: 10000원
const STAR_AMOUNTS = [0, 0, 3000, 5000, 7000, 10000];

export default function BucketPage() {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [message, setMessage] = useState("");

  const amount = STAR_AMOUNTS[rating] || 0;

  const formatAmount = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  const handlePayment = () => {
    if (rating === 0) {
      alert("별점을 선택해주세요.");
      return;
    }

    if (amount === 0) {
      alert("피드백 감사합니다! 💛");
      return;
    }

    // Toss 송금 링크 생성
    const tossUrl = `supertoss://send?amount=${amount}&bank=${BANK_INFO.bankEncoded}&accountNo=${BANK_INFO.accountNo}&origin=qr`;
    window.open(tossUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-amber-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
          >
            ← 돌아가기
          </a>
          <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">
            🪣 버킷
          </h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🪣</div>
          <h2 className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-3">
            부기북스 버킷
          </h2>
          <p className="text-amber-700 dark:text-amber-300 text-lg leading-relaxed">
            부기북스의 컨텐츠에 만족하신만큼
            <br />
            자유로운 금액으로 응원해주세요!
          </p>
        </div>

        {/* Payment Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-amber-100 dark:border-gray-700">
          {/* Star Rating */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-4 text-center">
              만족도를 별점으로 표현해주세요
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-5xl transition-transform duration-200 hover:scale-110 focus:outline-none"
                >
                  {star <= (hoveredRating || rating) ? (
                    <span className="text-amber-400 drop-shadow-md">★</span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">☆</span>
                  )}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center mt-4 text-amber-700 dark:text-amber-300 font-medium">
                {formatAmount(STAR_AMOUNTS[rating])}원
              </p>
            )}
          </div>

          {/* Message (Optional) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">
              응원 메시지 (선택)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="부기북스에게 전하고 싶은 말..."
              rows={3}
              className="w-full py-4 px-5 rounded-xl border-2 border-amber-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-400/30 resize-none transition-all duration-200"
            />
          </div>

          {/* Summary */}
          {rating > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 mb-8 border border-amber-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-amber-700 dark:text-amber-300">
                  후원 금액
                </span>
                <span className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {amount === 0 ? "무료 피드백" : `${formatAmount(amount)}원`}
                </span>
              </div>
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={rating === 0}
            className={`w-full py-5 rounded-2xl font-bold text-xl transition-all duration-300 ${
              rating > 0
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            {rating === 0
              ? "별점을 선택해주세요"
              : amount === 0
                ? "피드백 보내기 💛"
                : "토스로 후원하기 💛"}
          </button>

          {/* Info */}
          {rating > 0 && amount > 0 && (
            <p className="text-center text-amber-600 dark:text-amber-400 text-sm mt-4">
              토스 앱으로 이동하여 결제가 진행됩니다
            </p>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-full px-6 py-3 text-amber-700 dark:text-amber-300">
            <span>📚</span>
            <span>여러분의 피드백으로 더 좋은 컨텐츠를 만들어 갑니다.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
