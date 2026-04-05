import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { Route } from './+types/boogi-out.$id';
import {
  applyBoogiOut,
  cancelMyBoogiOutApplication,
  closeBoogiOutRegistrations,
  confirmBoogiOutDate,
  confirmBoogiOutPayment,
  formatDateTime,
  getBoogiOut,
  getBoogiOutApplicationsForPlanner,
  getMe,
  getMyBoogiOutApplication,
  settleBoogiOutAfterParty,
  type BoogiOutApplicationRow,
  type BoogiOutDetail,
  type UserData,
} from '../lib/api';

export function meta({}: Route.MetaArgs) {
  return [{ title: '부깃아웃' }];
}

const EVENT_STATUS_KO: Record<string, string> = {
  STANDBY: '준비 중',
  IN_PROGRESS: '모집 중',
  CLOSED_REGISTRATION: '모집 완료',
  COMPLETED: '종료',
  CANCELLED: '취소',
};

const APP_STATUS_KO: Record<string, string> = {
  PENDING: '신청됨',
  AWAITING_PAYMENT: '결제 대기 중',
  PAID: '결제 완료',
  CANCELLED: '취소',
};

export default function BoogiOutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<BoogiOutDetail | null>(null);
  const [me, setMe] = useState<UserData | null>(null);
  const [myApp, setMyApp] = useState<BoogiOutApplicationRow | null>(null);
  const [plannerApps, setPlannerApps] = useState<BoogiOutApplicationRow[]>([]);
  const [responseText, setResponseText] = useState('');
  /** 뒷풀이 있을 때만 사용; null이면 미선택 */
  const [afterPartyChoice, setAfterPartyChoice] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const [confirmDateLocal, setConfirmDateLocal] = useState('');
  const [afterTotal, setAfterTotal] = useState('');
  const [afterBankName, setAfterBankName] = useState('');
  const [afterAccount, setAfterAccount] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ev, user] = await Promise.all([
        getBoogiOut(id),
        getMe().catch(() => null),
      ]);
      setEvent(ev);
      setMe(user);
      if (user && user.role !== 'VISITOR') {
        const mine = await getMyBoogiOutApplication(id).catch(() => null);
        setMyApp(mine ?? null);
        if (ev.viewerIsPlanner) {
          const apps = await getBoogiOutApplicationsForPlanner(id).catch(
            () => [],
          );
          setPlannerApps(Array.isArray(apps) ? apps : []);
        } else {
          setPlannerApps([]);
        }
      } else {
        setMyApp(null);
        setPlannerApps([]);
      }
    } catch (e) {
      console.error(e);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    setResponseText('');
    setAfterPartyChoice(null);
  }, [id]);

  const isCreator = me && event && me.id === event.creator.id;
  const viewerIsPlanner = Boolean(event?.viewerIsPlanner);

  const hasActiveApplication = myApp && myApp.status !== 'CANCELLED';

  const canApply =
    me &&
    me.role !== 'VISITOR' &&
    event &&
    (event.status === 'STANDBY' || event.status === 'IN_PROGRESS') &&
    !hasActiveApplication;

  const handleApply = async () => {
    if (!id || !event) return;
    if (event.applicantResponseEnabled && !responseText.trim()) {
      alert('등록 시 질문에 응답해 주세요.');
      return;
    }
    if (event.afterPartyEnabled && afterPartyChoice === null) {
      alert('뒷풀이 참여 여부를 선택해 주세요.');
      return;
    }
    try {
      await applyBoogiOut(id, {
        responseText: event.applicantResponseEnabled
          ? responseText.trim()
          : undefined,
        afterPartyOptIn: event.afterPartyEnabled
          ? afterPartyChoice!
          : undefined,
      });
      alert('신청이 완료되었습니다.');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '신청에 실패했습니다.');
    }
  };

  const handleCancelApplication = async () => {
    if (!id) return;
    if (!confirm('신청을 취소할까요?')) return;
    try {
      await cancelMyBoogiOutApplication(id);
      alert('취소되었습니다.');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '취소에 실패했습니다.');
    }
  };

  const handleCloseRegistrations = async () => {
    if (!id) return;
    if (!confirm('신청을 마감할까요? 마감 후 결제 안내가 진행됩니다.')) return;
    try {
      await closeBoogiOutRegistrations(id);
      alert('마감 처리되었습니다.');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '마감 처리에 실패했습니다.');
    }
  };

  const handleConfirmDate = async () => {
    if (!id || !confirmDateLocal) return;
    try {
      await confirmBoogiOutDate(id, new Date(confirmDateLocal).toISOString());
      alert('일정이 확정되었습니다.');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '실패');
    }
  };

  const handleConfirmPayment = async () => {
    if (!id) return;
    try {
      await confirmBoogiOutPayment(id);
      alert('결제 완료로 처리되었습니다.');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '실패');
    }
  };

  const handleAfterParty = async () => {
    if (!id) return;
    const total = parseInt(afterTotal, 10);
    if (Number.isNaN(total) || total < 0) {
      alert('총액을 입력해주세요.');
      return;
    }
    if (!afterBankName.trim()) {
      alert('은행명을 입력해주세요.');
      return;
    }
    if (!afterAccount.trim()) {
      alert('계좌번호를 입력해주세요.');
      return;
    }
    try {
      await settleBoogiOutAfterParty(id, {
        totalAmount: total,
        bankName: afterBankName.trim(),
        accountNumber: afterAccount.trim(),
      });
      alert('정산 안내가 전송되었습니다.');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '실패');
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#faf8f3] dark:bg-gray-900'>
        <div className='animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent' />
      </div>
    );
  }

  if (!event) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4'>
        <p className='text-gray-600'>이벤트를 찾을 수 없습니다.</p>
        <button
          type='button'
          onClick={() => navigate('/boogi-out')}
          className='text-teal-700'
        >
          목록으로
        </button>
      </div>
    );
  }

  const paidCount = plannerApps.filter((a) => a.status === 'PAID').length;
  const afterPartyPaidCount = plannerApps.filter(
    (a) => a.status === 'PAID' && a.afterPartyOptIn === true,
  ).length;
  const eventStatusLabel = EVENT_STATUS_KO[event.status] ?? event.status;

  const canManualClose =
    viewerIsPlanner &&
    (event.status === 'STANDBY' || event.status === 'IN_PROGRESS') &&
    !event.registrationClosedAt;

  return (
    <div className='min-h-screen bg-[#faf8f3] dark:bg-gray-900 pb-16'>
      <header className='bg-white dark:bg-gray-800 shadow'>
        <div className='max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3'>
          <button
            type='button'
            onClick={() => navigate('/boogi-out')}
            className='text-gray-600 dark:text-gray-300 shrink-0'
          >
            ← 목록
          </button>
          <span className='text-xs font-medium text-teal-800 dark:text-teal-300 text-right'>
            {eventStatusLabel}
          </span>
        </div>
      </header>

      <main className='max-w-3xl mx-auto px-4 py-8 space-y-8'>
        {event.promotionalImageUrl && (
          <div className='w-full rounded-2xl shadow-lg overflow-hidden bg-[#ebe8e0] dark:bg-gray-800/90 border border-stone-200/70 dark:border-gray-700'>
            <img
              src={event.promotionalImageUrl}
              alt=''
              className='block w-full max-w-full h-auto align-middle'
            />
          </div>
        )}

        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            {event.title}
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            기획: {event.creator.username}
          </p>
        </div>

        <section className='prose dark:prose-invert max-w-none'>
          <p className='text-gray-800 dark:text-gray-200 whitespace-pre-wrap'>
            {event.description}
          </p>
        </section>

        <section className='rounded-xl bg-white dark:bg-gray-800 shadow p-5 space-y-2 text-sm'>
          <p>
            <span className='text-gray-500'>장소</span>{' '}
            <span className='text-gray-900 dark:text-white'>
              {event.location}
            </span>
          </p>
          {event.eventDate && (
            <p>
              <span className='text-gray-500'>일시</span>{' '}
              {formatDateTime(event.eventDate)}
            </p>
          )}
          {event.timeMode === 'SET_TOGETHER' && !event.eventDate && (
            <p className='text-amber-700 dark:text-amber-400'>
              일정은 인원이 모이면 함께 정합니다.
            </p>
          )}
          {!viewerIsPlanner && (
            <p className='text-teal-800 dark:text-teal-300 pt-2 border-t border-gray-100 dark:border-gray-700'>
              <span className='text-gray-500'>예상 가격</span>{' '}
              <strong className='text-lg'>
                {event.expectedPrice.toLocaleString('ko-KR')}원
              </strong>
              <span className='text-xs text-gray-500 block mt-1'>
                (신청자 수에 따라 가격이 변동될 수 있으며 확정된 가격으로
                결제합니다.)
              </span>
            </p>
          )}
        </section>

        {viewerIsPlanner &&
          event.costMode != null &&
          event.costAmount != null && (
            <section className='rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-5 space-y-2 text-sm'>
              <h2 className='font-semibold text-gray-900 dark:text-white'>
                비용·정산 (기획자·관리자 전용)
              </h2>
              <p>
                <span className='text-gray-500'>비용 방식</span>{' '}
                {event.costMode === 'TOTAL' ? '총액' : '1인당'}{' '}
                <span className='text-gray-900 dark:text-white'>
                  {event.costAmount.toLocaleString('ko-KR')}원
                </span>
                {event.feePercent != null && (
                  <span className='text-gray-500'>
                    {' '}
                    · 수수료 {event.feePercent}%
                  </span>
                )}
              </p>
              <p>
                <span className='text-gray-500'>수요 인원</span>{' '}
                {event.demandParticipants}명
              </p>
              <p>
                <span className='text-gray-500'>
                  현재 신청 인원 기준 1인 부담
                </span>{' '}
                <strong className='text-gray-900 dark:text-white'>
                  {event.expectedPrice.toLocaleString('ko-KR')}원
                </strong>
                <span className='text-xs text-gray-500 block mt-1'>
                  취소 제외 {event.activeApplicantCount ?? 0}명 · 수수료 포함
                  {event.costMode === 'TOTAL'
                    ? ' · 실제 정산 시점 인원에 따라 달라질 수 있음'
                    : ''}
                </span>
              </p>
              <p>
                <span className='text-gray-500'>정산</span>{' '}
                {event.settlementMode === 'COMMISSION'
                  ? '현금성 정산'
                  : '코인 1개 획득'}
              </p>
              {event.settlementMode === 'COMMISSION' && (
                <p className='text-gray-800 dark:text-gray-200'>
                  <span className='text-gray-500'>입금 계좌</span>{' '}
                  {event.commissionBankName} {event.commissionAccountNumber}
                </p>
              )}
            </section>
          )}

        {viewerIsPlanner && canManualClose && (
          <section className='rounded-xl border border-rose-200 dark:border-rose-900/50 p-5'>
            <button
              type='button'
              onClick={() => void handleCloseRegistrations()}
              className='w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm'
            >
              신청 마감
            </button>
            <p className='text-xs text-gray-500 mt-2 text-center'>
              마감 시 신청 중인 분들에게 결제 안내가 발송됩니다.
            </p>
          </section>
        )}

        {viewerIsPlanner && plannerApps.length > 0 && (
          <section className='rounded-xl bg-white dark:bg-gray-800 shadow p-5 space-y-3'>
            <h2 className='font-semibold text-gray-900 dark:text-white'>
              신청자 ({plannerApps.length})
            </h2>
            <ul className='divide-y divide-gray-100 dark:divide-gray-700 text-sm'>
              {plannerApps.map((a) => (
                <li
                  key={a.id}
                  className='py-2 flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center sm:gap-2'
                >
                  <span className='text-gray-900 dark:text-white'>
                    {a.user.username}
                  </span>
                  <div className='flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm'>
                    <span className='text-gray-500 shrink-0'>
                      {APP_STATUS_KO[a.status] ?? a.status}
                    </span>
                    {event.afterPartyEnabled && (
                      <span className='text-teal-700 dark:text-teal-400'>
                        뒷풀이:{' '}
                        {a.afterPartyOptIn === true
                          ? '참여'
                          : a.afterPartyOptIn === false
                            ? '불참'
                            : '—'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isCreator &&
          event.status === 'STANDBY' &&
          event.timeMode === 'SET_TOGETHER' && (
            <section className='rounded-xl border border-teal-200 dark:border-teal-800 p-5 space-y-3'>
              <h2 className='font-semibold text-gray-900 dark:text-white'>
                기획자: 일정 확정
              </h2>
              <input
                type='datetime-local'
                className='w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900'
                value={confirmDateLocal}
                onChange={(e) => setConfirmDateLocal(e.target.value)}
              />
              <button
                type='button'
                onClick={() => void handleConfirmDate()}
                className='px-4 py-2 bg-teal-600 text-white rounded-lg text-sm'
              >
                개최 일시 확정
              </button>
            </section>
          )}

        {isCreator && event.afterPartyEnabled && afterPartyPaidCount > 0 && (
          <section className='rounded-xl border border-amber-200 dark:border-amber-800 p-5 space-y-3'>
            <h2 className='font-semibold text-gray-900 dark:text-white'>
              뒷풀이 1/n 정산
            </h2>
            <p className='text-xs text-gray-500'>
              뒷풀이 참여로 신청하고 결제를 완료한 분(
              {afterPartyPaidCount}명)에게만 DM으로 안내합니다. 모임 종료 후
              총액과 계좌를 입력해 주세요.
            </p>
            <input
              type='number'
              min={0}
              placeholder='총액 (원)'
              className='w-full rounded-lg border px-3 py-2'
              value={afterTotal}
              onChange={(e) => setAfterTotal(e.target.value)}
            />
            <input
              placeholder='은행명 (예: KB국민은행)'
              className='w-full rounded-lg border px-3 py-2'
              value={afterBankName}
              onChange={(e) => setAfterBankName(e.target.value)}
            />
            <input
              placeholder='계좌번호'
              className='w-full rounded-lg border px-3 py-2'
              value={afterAccount}
              onChange={(e) => setAfterAccount(e.target.value)}
            />
            <button
              type='button'
              onClick={() => void handleAfterParty()}
              className='px-4 py-2 bg-amber-600 text-white rounded-lg text-sm'
            >
              정산 DM 보내기
            </button>
          </section>
        )}

        {(canApply || hasActiveApplication) && (
          <section className='rounded-xl bg-white dark:bg-gray-800 shadow p-5 space-y-4'>
            <h2 className='font-semibold text-gray-900 dark:text-white'>
              신청
            </h2>
            {hasActiveApplication && myApp ? (
              <div className='text-sm text-gray-600 dark:text-gray-400 space-y-3'>
                <p>
                  상태:{' '}
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {APP_STATUS_KO[myApp.status] ?? myApp.status}
                  </span>
                </p>
                {event.applicantResponseEnabled && myApp.responseText && (
                  <div className='rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3 text-gray-700 dark:text-gray-300'>
                    <p className='text-xs text-gray-500 mb-1'>
                      {event.applicantResponseLabel || '등록 시 응답'}
                    </p>
                    <p className='whitespace-pre-wrap'>{myApp.responseText}</p>
                  </div>
                )}
                {event.afterPartyEnabled && myApp.afterPartyOptIn != null && (
                  <p className='text-gray-700 dark:text-gray-300'>
                    뒷풀이:{' '}
                    <span className='font-medium text-gray-900 dark:text-white'>
                      {myApp.afterPartyOptIn ? '참여 예정' : '불참'}
                    </span>
                    {myApp.afterPartyOptIn === true &&
                      event.afterPartyBudgetPerPerson != null &&
                      event.afterPartyBudgetPerPerson > 0 && (
                        <span className='text-gray-500 text-xs block mt-1'>
                          예상 1인 부담 약{' '}
                          {event.afterPartyBudgetPerPerson.toLocaleString(
                            'ko-KR',
                          )}
                          원 (참고)
                        </span>
                      )}
                  </p>
                )}
                {(myApp.status === 'PENDING' ||
                  myApp.status === 'AWAITING_PAYMENT') && (
                  <button
                    type='button'
                    onClick={() => void handleCancelApplication()}
                    className='w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm'
                  >
                    신청 취소
                  </button>
                )}
                {myApp.status === 'AWAITING_PAYMENT' && (
                  <div className='space-y-2'>
                    <p className='text-amber-800 dark:text-amber-300'>
                      마감 후 결제 안내를 DM으로 받으셨다면, 송금 후 아래에서
                      완료를 눌러주세요.
                    </p>
                    <button
                      type='button'
                      onClick={() => void handleConfirmPayment()}
                      className='w-full py-3 rounded-xl bg-teal-600 text-white font-medium'
                    >
                      결제 완료 처리
                    </button>
                  </div>
                )}
                {myApp.status === 'PAID' && myApp.proofToken && (
                  <p className='mt-2 text-xs'>
                    참석 증명 페이지:{' '}
                    <a
                      className='text-teal-700 underline'
                      href={`/boogi-out/${id}/proof/${myApp.proofToken}`}
                    >
                      열기
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <>
                {event.applicantResponseEnabled && (
                  <div>
                    <label className='text-sm text-gray-600 dark:text-gray-400 block mb-1'>
                      {event.applicantResponseLabel || '등록 시 질문'}
                    </label>
                    <textarea
                      className='w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3 bg-white dark:bg-gray-900'
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder='기획자가 요청한 내용에 맞게 적어 주세요.'
                    />
                  </div>
                )}
                {event.afterPartyEnabled && (
                  <fieldset className='space-y-3'>
                    <legend className='text-sm font-medium text-gray-800 dark:text-gray-200 mb-2'>
                      뒷풀이 참여
                    </legend>
                    <div className='flex flex-col gap-2'>
                      <label className='flex items-start gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300'>
                        <input
                          type='radio'
                          name='afterParty'
                          className='mt-1'
                          checked={afterPartyChoice === true}
                          onChange={() => setAfterPartyChoice(true)}
                        />
                        <span>
                          참여
                          {afterPartyChoice === true &&
                            event.afterPartyBudgetPerPerson != null &&
                            event.afterPartyBudgetPerPerson > 0 && (
                              <span className='block text-teal-800 dark:text-teal-300 font-medium mt-1'>
                                예상 1인 부담 약{' '}
                                {event.afterPartyBudgetPerPerson.toLocaleString(
                                  'ko-KR',
                                )}
                                원
                              </span>
                            )}
                          {afterPartyChoice === true &&
                            (event.afterPartyBudgetPerPerson == null ||
                              event.afterPartyBudgetPerPerson <= 0) && (
                              <span className='block text-gray-500 text-xs mt-1'>
                                예상 금액은 기획자 설정에 따라 달라질 수 있어요.
                              </span>
                            )}
                        </span>
                      </label>
                      <label className='flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300'>
                        <input
                          type='radio'
                          name='afterParty'
                          checked={afterPartyChoice === false}
                          onChange={() => setAfterPartyChoice(false)}
                        />
                        불참
                      </label>
                    </div>
                    {afterPartyChoice === true && (
                      <p className='text-xs text-gray-600 dark:text-gray-400 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-3 leading-relaxed'>
                        뒷풀이 비용은 모임이 끝난 뒤 <strong>개별 DM</strong>
                        으로 더치페이(1/n) 금액을 안내드릴 예정입니다. 위 금액은
                        참고용 예상치입니다.
                      </p>
                    )}
                  </fieldset>
                )}
                <button
                  type='button'
                  onClick={() => void handleApply()}
                  className='w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium'
                >
                  신청하기
                </button>
              </>
            )}
          </section>
        )}

        {!me && (
          <p className='text-center text-sm text-gray-500'>
            로그인 후 신청할 수 있습니다.
          </p>
        )}
        {me?.role === 'VISITOR' && (
          <p className='text-center text-sm text-gray-500'>
            부기 멤버만 신청할 수 있습니다.
          </p>
        )}
      </main>
    </div>
  );
}
