import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/boogi-out.create";
import {
  createBoogiOut,
  getMe,
  navigateHomeRememberingReturn,
  uploadBoogiOutPromoImage,
  type BoogiOutCostMode,
  type BoogiOutSettlementMode,
  type BoogiOutTimeMode,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [{ title: "부깃아웃 기획" }, { name: "description", content: "부깃아웃 기획안 작성" }];
}

const STEPS = 7;

export default function BoogiOutCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [costMode, setCostMode] = useState<BoogiOutCostMode>("TOTAL");
  const [costAmount, setCostAmount] = useState(100000);
  const [settlementMode, setSettlementMode] =
    useState<BoogiOutSettlementMode>("COMMISSION");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [demandParticipants, setDemandParticipants] = useState(6);
  const [commissionBankName, setCommissionBankName] = useState("");
  const [commissionAccountNumber, setCommissionAccountNumber] = useState("");

  const [timeMode, setTimeMode] = useState<BoogiOutTimeMode>("CONFIRMED");
  const [eventDateLocal, setEventDateLocal] = useState("");
  const [targetHeadcount, setTargetHeadcount] = useState("");
  const [dateSelectionMockupUrl, setDateSelectionMockupUrl] = useState("");

  const [applicantResponseEnabled, setApplicantResponseEnabled] =
    useState(false);
  const [applicantResponseLabel, setApplicantResponseLabel] = useState("");

  const [afterPartyEnabled, setAfterPartyEnabled] = useState(false);
  const [afterPartyBudgetPerPerson, setAfterPartyBudgetPerPerson] =
    useState("");

  const [promotionalImageUrl, setPromotionalImageUrl] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigateHomeRememberingReturn(navigate);
      return;
    }
    void getMe().then((me) => {
      if (me?.role === "VISITOR") {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return (
          title.trim().length > 0 &&
          description.trim().length > 0 &&
          location.trim().length > 0
        );
      case 1:
        if (costAmount < 0 || demandParticipants < 1) return false;
        if (settlementMode === "COMMISSION") {
          return (
            commissionBankName.trim().length > 0 &&
            commissionAccountNumber.trim().length > 0
          );
        }
        return true;
      case 2:
        if (timeMode === "CONFIRMED") return eventDateLocal.length > 0;
        return true;
      case 3:
        if (applicantResponseEnabled)
          return applicantResponseLabel.trim().length > 0;
        return true;
      case 4:
        if (afterPartyEnabled) {
          const n = parseInt(afterPartyBudgetPerPerson, 10);
          return !Number.isNaN(n) && n >= 0;
        }
        return true;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: Parameters<typeof createBoogiOut>[0] = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        costMode,
        costAmount,
        settlementMode,
        demandParticipants: Math.max(1, demandParticipants),
        timeMode,
        applicantResponseEnabled,
        afterPartyEnabled,
      };

      if (settlementMode === "COMMISSION") {
        payload.commissionBankName = commissionBankName.trim();
        payload.commissionAccountNumber = commissionAccountNumber.trim();
      }

      const mp = maxParticipants.trim();
      if (mp) payload.maxParticipants = parseInt(mp, 10);

      if (timeMode === "CONFIRMED" && eventDateLocal) {
        payload.eventDate = new Date(eventDateLocal).toISOString();
      }
      if (timeMode === "SET_TOGETHER") {
        const th = targetHeadcount.trim();
        if (th) payload.targetHeadcount = parseInt(th, 10);
        if (dateSelectionMockupUrl.trim())
          payload.dateSelectionMockupUrl = dateSelectionMockupUrl.trim();
      }

      if (applicantResponseEnabled) {
        payload.applicantResponseLabel = applicantResponseLabel.trim();
      }
      if (afterPartyEnabled) {
        payload.afterPartyBudgetPerPerson = parseInt(
          afterPartyBudgetPerPerson,
          10,
        );
      }
      if (promotionalImageUrl.trim()) {
        payload.promotionalImageUrl = promotionalImageUrl.trim();
      }

      const created = await createBoogiOut(payload);
      navigate(`/boogi-out/${created.id}`);
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error ? e.message : "등록에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!canNext()) {
      alert("입력을 확인해주세요.");
      return;
    }
    if (step < STEPS - 1) setStep(step + 1);
    else void handleSubmit();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-[#faf8f3] dark:from-gray-900 dark:to-gray-900 flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-teal-100/80 dark:border-gray-700 bg-white/70 dark:bg-gray-900/80 backdrop-blur">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate("/boogi-out") : prev())}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {step === 0 ? "취소" : "← 이전"}
        </button>
        <span className="text-xs text-gray-500">
          {step + 1} / {STEPS}
        </span>
        <div className="w-12" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-4 py-8 max-w-lg mx-auto w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 min-h-[320px] flex flex-col justify-center border border-teal-100/50 dark:border-gray-700">
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
                기본 정보
              </p>
              <div>
                <label className="text-xs text-gray-500 block mb-1">주제</label>
                <input
                  className="w-full text-xl font-semibold rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="모임 주제"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  간단한 설명
                </label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="어떤 모임인지 짧게 소개해주세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">장소</label>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="예: 홍대 OO카페"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
                비용 (수수료 10% 고정)
              </p>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cm"
                    checked={costMode === "TOTAL"}
                    onChange={() => setCostMode("TOTAL")}
                  />
                  <span className="text-gray-900 dark:text-white">총액</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cm"
                    checked={costMode === "PER_PERSON"}
                    onChange={() => setCostMode("PER_PERSON")}
                  />
                  <span className="text-gray-900 dark:text-white">1인당</span>
                </label>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  금액 (원)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  value={costAmount}
                  onChange={(e) =>
                    setCostAmount(parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  수요 인원 (예상 가격 = 총액 ÷ 수요 인원, 1인당 모드에서는 신청자에게 1인 금액으로 표시)
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2"
                  value={demandParticipants}
                  onChange={(e) =>
                    setDemandParticipants(
                      Math.max(1, parseInt(e.target.value, 10) || 1),
                    )
                  }
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  커미션 정산
                </p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sm"
                      checked={settlementMode === "COMMISSION"}
                      onChange={() => setSettlementMode("COMMISSION")}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      현금성 정산
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sm"
                      checked={settlementMode === "COIN_GAIN"}
                      onChange={() => setSettlementMode("COIN_GAIN")}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      코인 1개 획득
                    </span>
                  </label>
                </div>
              </div>
              {settlementMode === "COMMISSION" && (
                <div className="space-y-3 rounded-xl border border-teal-100 dark:border-teal-900/40 p-4 bg-teal-50/50 dark:bg-teal-950/20">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      은행명
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm"
                      value={commissionBankName}
                      onChange={(e) => setCommissionBankName(e.target.value)}
                      placeholder="예: KB국민은행"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      계좌번호
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm"
                      value={commissionAccountNumber}
                      onChange={(e) =>
                        setCommissionAccountNumber(e.target.value)
                      }
                      placeholder="계좌번호 (하이픈 포함 가능)"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  정원 (선택, 비우면 무제한)
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="예: 12"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
                일정
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tm"
                    checked={timeMode === "CONFIRMED"}
                    onChange={() => setTimeMode("CONFIRMED")}
                  />
                  <span className="text-gray-900 dark:text-white">확정</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tm"
                    checked={timeMode === "SET_TOGETHER"}
                    onChange={() => setTimeMode("SET_TOGETHER")}
                  />
                  <span className="text-gray-900 dark:text-white">함께 설정</span>
                </label>
              </div>
              {timeMode === "CONFIRMED" ? (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    개최 일시
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-900"
                    value={eventDateLocal}
                    onChange={(e) => setEventDateLocal(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      목표 인원 (선택)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2"
                      value={targetHeadcount}
                      onChange={(e) => setTargetHeadcount(e.target.value)}
                      placeholder="예: 6"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      날짜 조율용 링크 (mockup, 선택)
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm"
                      value={dateSelectionMockupUrl}
                      onChange={(e) => setDateSelectionMockupUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
                신청자 응답
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applicantResponseEnabled}
                  onChange={(e) =>
                    setApplicantResponseEnabled(e.target.checked)
                  }
                />
                <span className="text-gray-900 dark:text-white">
                  신청 시 한 가지 텍스트 응답 받기
                </span>
              </label>
              {applicantResponseEnabled && (
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2"
                  placeholder="질문 문구 (예: 선호하는 시간대)"
                  value={applicantResponseLabel}
                  onChange={(e) => setApplicantResponseLabel(e.target.value)}
                />
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
                뒷풀이
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={afterPartyEnabled}
                  onChange={(e) => setAfterPartyEnabled(e.target.checked)}
                />
                <span className="text-gray-900 dark:text-white">뒷풀이 있음</span>
              </label>
              {afterPartyEnabled && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    1인당 예상 예산 (원)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2"
                    value={afterPartyBudgetPerPerson}
                    onChange={(e) => setAfterPartyBudgetPerPerson(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
                홍보 이미지
              </p>
              <p className="text-xs text-gray-500">
                파일을 선택하면 서버가 Vultr Object Storage에 올리고, 아래에 공개 URL이
                채워집니다. 직접 URL을 넣어도 됩니다.
              </p>
              <label className="block">
                <span className="sr-only">이미지 파일</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploadingImage}
                  className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:font-medium"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadingImage(true);
                    try {
                      const { url } = await uploadBoogiOutPromoImage(f);
                      setPromotionalImageUrl(url);
                    } catch (err) {
                      alert(
                        err instanceof Error ? err.message : "업로드에 실패했습니다.",
                      );
                    } finally {
                      setUploadingImage(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              {uploadingImage && (
                <p className="text-xs text-teal-600">업로드 중…</p>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  이미지 URL (업로드 시 자동 입력)
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm"
                  placeholder="https://..."
                  value={promotionalImageUrl}
                  onChange={(e) => setPromotionalImageUrl(e.target.value)}
                />
              </div>
              {promotionalImageUrl.trim() && (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  <img
                    src={promotionalImageUrl}
                    alt="홍보 미리보기"
                    className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
              <p className="font-semibold text-gray-900 dark:text-white">
                확인 후 등록
              </p>
              <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                <li>주제: {title}</li>
                <li>장소: {location}</li>
                <li>
                  비용: {costMode === "TOTAL" ? "총액" : "1인당"}{" "}
                  {costAmount.toLocaleString("ko-KR")}원 · 수요 인원{" "}
                  {demandParticipants}명
                </li>
                <li>
                  정산:{" "}
                  {settlementMode === "COMMISSION"
                    ? `현금성 (${commissionBankName} ${commissionAccountNumber})`
                    : "코인 1개 획득"}
                </li>
                <li>
                  일정:{" "}
                  {timeMode === "CONFIRMED"
                    ? eventDateLocal || "-"
                    : "함께 설정 (스탠바이)"}
                </li>
                <li>
                  신청 응답:{" "}
                  {applicantResponseEnabled
                    ? applicantResponseLabel
                    : "없음"}
                </li>
                <li>
                  뒷풀이:{" "}
                  {afterPartyEnabled
                    ? `${afterPartyBudgetPerPerson}원/인 예상`
                    : "없음"}
                </li>
                {promotionalImageUrl.trim() && (
                  <li className="list-none -ml-4 mt-2">
                    <img
                      src={promotionalImageUrl}
                      alt=""
                      className="max-h-24 rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={next}
          className="mt-8 w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-lg shadow-lg disabled:opacity-50"
        >
          {step === STEPS - 1 ? (submitting ? "등록 중…" : "등록하기") : "다음"}
        </button>
      </div>
    </div>
  );
}
