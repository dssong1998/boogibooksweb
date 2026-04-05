const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 토큰 만료 시 로그아웃 처리
function handleTokenExpired() {
  localStorage.removeItem('auth_token');
  // 현재 페이지가 로그인 페이지가 아니면 리다이렉트
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/auth')
  ) {
    window.location.href = '/';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // 401 Unauthorized = 토큰 만료 또는 무효
  if (response.status === 401) {
    handleTokenExpired();
    throw new Error('Token expired');
  }

  if (!response.ok) {
    let msg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errText = await response.text();
      const j = JSON.parse(errText) as { message?: string | string[] };
      if (j.message) {
        msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
      }
    } catch {
      /* keep msg */
    }
    throw new Error(msg);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // 빈 응답 처리
  const text = await response.text();
  if (!text || text.trim() === '') {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export type EventType =
  | 'MEETING'
  | 'DIGGING_CLUB'
  | 'BOOGITOUT'
  | 'ONLINE'
  | 'OTHER';

export interface UserData {
  id: string;
  username: string;
  email: string | null;
  role: string;
  coins?: number;
  totalBooksRead?: number;
  eventsParticipated?: number;
  diggingsCount?: number;
  isTerras?: boolean;
}

export interface EventData {
  id: string;
  title: string;
  content?: string | null;
  date?: string | null;
  location?: string | null;
  eventType?: EventType;
  price?: number;
  capacity?: number | null;
  requiredCoins?: number | null;
  maxParticipants?: number | null;
  applications?: { id: string }[] | null; // 신청자 목록
}

export interface BookData {
  id: string;
  userId?: string;
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  coverUrl?: string | null;
  description?: string | null;
}

export type CommentType = 'PREVIEW' | 'REVIEW' | 'QUOTE';

export interface CommentData {
  id: string;
  userId: string;
  type?: CommentType;
  content: string;
  page?: number | null;
  createdAt: string;
  user?: { username?: string | null };
}

export interface DiggingData {
  id: string;
  url: string;
  title?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  createdAt: string;
}

export interface NaverBookItem {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  image: string;
  description?: string;
}

export function getMe() {
  return fetchAPI<UserData>('/auth/me');
}

export async function getEvents() {
  const events = await fetchAPI<EventData[]>('/events');
  const currentDate = new Date();
  const futureEvents = events.filter((event) => {
    const eventDate = new Date(event.date as string);
    return eventDate > currentDate;
  });
  return futureEvents;
}

export function getEvent(id: string) {
  return fetchAPI<EventData>(`/events/${id}`);
}

export function createEvent(payload: {
  title: string;
  content?: string;
  date: string;
  location?: string;
  capacity?: number;
}) {
  return fetchAPI<EventData>('/events', 'POST', payload);
}

export function updateEvent(id: string, payload: Partial<EventData>) {
  return fetchAPI<EventData>(`/events/${id}`, 'PATCH', payload);
}

export function deleteEvent(id: string) {
  return fetchAPI<void>(`/events/${id}`, 'DELETE');
}

// 이벤트 신청 관련 API
export interface EventEligibility {
  eligible: boolean;
  reason?: string;
  isFree: boolean;
  isOverCapacity: boolean;
  libraryMessageCount: number;
  alreadyApplied: boolean;
  existingStatus?: string;
}

export interface EventApplicationResult {
  success: boolean;
  libraryMessageCount: number;
  applicationOrder: number;
  status: string;
  usedCoins: number;
  message: string;
  isFree: boolean;
}

export function checkEventEligibility(eventId: string) {
  return fetchAPI<EventEligibility>(`/events/${eventId}/eligibility`);
}

export function applyToEvent(eventId: string, useCoins: boolean = false) {
  return fetchAPI<EventApplicationResult>(`/events/${eventId}/apply`, 'POST', {
    useCoins,
  });
}

export function confirmEventPayment(eventId: string, userId?: string) {
  return fetchAPI<{ success: boolean; message: string }>(
    `/events/${eventId}/confirm-payment`,
    'POST',
    userId ? { userId } : undefined,
  );
}

export type PaymentKindParam = 'EVENT' | 'BOOGI_OUT';

export interface PaymentTarget {
  paymentKind: PaymentKindParam;
  title: string;
  amount: number;
  eventType?: string;
  settlementMode?: string;
  commissionBankName?: string | null;
  commissionAccountNumber?: string | null;
}

export function getPaymentTarget(eventId: string, paymentKind: PaymentKindParam) {
  const q = new URLSearchParams({ eventId, paymentKind });
  return fetchAPI<PaymentTarget>(`/payments/target?${q.toString()}`);
}

// 사용자 정보 조회 (공개 API - 토큰 불필요)
export function getUserById(userId: string) {
  return fetchAPI<{
    id: string;
    username: string;
    discordId: string;
    isTerras: boolean;
  }>(`/users/${userId}`);
}

export function cancelEventApplication(eventId: string) {
  return fetchAPI<{ success: boolean; message: string; refundedCoins: number }>(
    `/events/${eventId}/cancel`,
    'DELETE',
  );
}

export function searchBooks(query: string) {
  return fetchAPI<{ items: NaverBookItem[] }>(
    `/books/search?query=${encodeURIComponent(query)}`,
  );
}

export function getBooks() {
  return fetchAPI<BookData[]>('/books');
}

export function getBook(id: string) {
  return fetchAPI<BookData>(`/books/${id}`);
}

export function createBook(payload: {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
}) {
  return fetchAPI<BookData>('/books', 'POST', payload);
}

export function updateBook(id: string, payload: Partial<BookData>) {
  return fetchAPI<BookData>(`/books/${id}`, 'PATCH', payload);
}

export function deleteBook(id: string) {
  return fetchAPI<void>(`/books/${id}`, 'DELETE');
}

export function getCommentsByBook(bookId: string) {
  return fetchAPI<CommentData[]>(`/comments/book/${bookId}`);
}

export function createComment(payload: {
  bookId: string;
  type?: CommentType;
  content: string;
  page?: number;
}) {
  return fetchAPI<CommentData>('/comments', 'POST', payload);
}

export function getDiggings() {
  return fetchAPI<DiggingData[]>('/digging');
}

export function createDigging(payload: { url: string; description?: string }) {
  return fetchAPI<DiggingData>('/digging', 'POST', payload);
}

export function deleteDigging(id: string) {
  return fetchAPI<void>(`/digging/${id}`, 'DELETE');
}

export function processPayment(payload: {
  eventId?: string | null;
  type?: string | null;
  coins: number;
}) {
  return fetchAPI<void>('/payments', 'POST', payload);
}

// ========== Admin APIs ==========

export interface MonthlyBookData {
  id: string;
  year: number;
  month: number;
  topic?: string | null; // 이달의 주제
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  recommendation?: string | null;
}

export interface ScheduleData {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  type: 'MEETING' | 'SHELLCAST' | 'DIGGING_CLUB' | 'MOVIE_NIGHT' | 'BOOGITOUT';
}

// Admin: Events
export function createAdminEvent(payload: {
  title: string;
  content?: string;
  date: string;
  location: string;
  eventType?: EventType;
  maxParticipants: number;
  requiredCoins?: number;
}) {
  return fetchAPI<EventData>('/admin/events', 'POST', payload);
}

export function getAdminEvents() {
  return fetchAPI<EventData[]>('/admin/events');
}

export function updateAdminEvent(id: string, payload: Partial<EventData>) {
  return fetchAPI<EventData>(`/admin/events/${id}`, 'PATCH', payload);
}

export function deleteAdminEvent(id: string) {
  return fetchAPI<void>(`/admin/events/${id}`, 'DELETE');
}

// Admin: Event Applications
export interface EventApplicationData {
  id: string;
  eventId: string;
  userId: string;
  applicationOrder: number;
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'CONFIRMED'
    | 'COIN_GUARANTEED'
    | 'CANCELLED';
  usedCoins: number;
  libraryMessageCount: number;
  paidAt?: string | null;
  createdAt: string;
  username: string;
  discordId: string;
  isTerras: boolean;
}

export function getEventApplications(eventId: string) {
  return fetchAPI<EventApplicationData[]>(`/events/${eventId}/applications`);
}

export function approveEventApplications(
  eventId: string,
  applicationIds: string[],
  options?: { finalizeApproval?: boolean },
) {
  return fetchAPI<{
    approved: number;
    coinRefunded: { userId: string; coins: number; discordId: string }[];
    dmSent: number;
    autoApprovedCoinUsers?: number;
    rejectedCount?: number;
  }>(`/events/${eventId}/approve`, 'POST', {
    applicationIds,
    finalizeApproval: options?.finalizeApproval ?? false,
  });
}

// Admin: Monthly Book
export function createAdminMonthlyBook(payload: {
  year: number;
  month: number;
  topic?: string; // 이달의 주제
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
  recommendation?: string;
}) {
  return fetchAPI<MonthlyBookData>('/admin/monthly-book', 'POST', payload);
}

export function getAdminMonthlyBooks() {
  return fetchAPI<MonthlyBookData[]>('/admin/monthly-book');
}

export function getCurrentMonthlyBooks() {
  return fetchAPI<MonthlyBookData[]>('/admin/monthly-book/current');
}

export function getMonthlyBooks(year: number, month: number) {
  return fetchAPI<MonthlyBookData[]>(`/admin/monthly-book/${year}/${month}`);
}

export function deleteAdminMonthlyBook(id: string) {
  return fetchAPI<void>(`/admin/monthly-book/${id}`, 'DELETE');
}

// Admin: Schedule
export function createAdminSchedule(payload: {
  title: string;
  description?: string;
  date: string;
  time?: string;
  type?: 'MEETING' | 'SHELLCAST' | 'DIGGING_CLUB' | 'MOVIE_NIGHT' | 'BOOGITOUT';
}) {
  return fetchAPI<ScheduleData>('/admin/schedule', 'POST', payload);
}

export function getAdminSchedules() {
  return fetchAPI<ScheduleData[]>('/admin/schedule');
}

export function getWeekSchedules() {
  return fetchAPI<ScheduleData[]>('/admin/schedule/week');
}

export function getMonthSchedules(year: number, month: number) {
  return fetchAPI<ScheduleData[]>(`/admin/schedule/month/${year}/${month}`);
}

export function updateAdminSchedule(
  id: string,
  payload: Partial<ScheduleData>,
) {
  return fetchAPI<ScheduleData>(`/admin/schedule/${id}`, 'PATCH', payload);
}

export function deleteAdminSchedule(id: string) {
  return fetchAPI<void>(`/admin/schedule/${id}`, 'DELETE');
}

// TableLog (식탁 방명록) 관련
export interface TableLogStats {
  totalDays: number; // 총 참여 일수
  totalLogs: number; // 총 로그 수
  monthlyStats: {
    month: string; // "2026-01" 형식
    count: number;
  }[];
  thisMonthMinutes: number; // 이번 달 이용시간 (분)
}

export interface TableLogMonthly {
  year: number;
  month: number;
  totalLogs: number;
  uniqueUsers: number;
  userStats: {
    discordId: string;
    username: string;
    count: number;
  }[];
}

export interface TableLogLeaderboard {
  discordId: string;
  username: string;
  totalDays: number;
}

// 내 식탁 참여 통계
export function getMyTableLogStats() {
  return fetchAPI<TableLogStats>('/table-logs/stats');
}

// 월별 전체 통계 (관리자용)
export function getTableLogMonthly(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.append('year', String(year));
  if (month) params.append('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchAPI<TableLogMonthly>(`/table-logs/monthly${query}`);
}

// 식탁 리더보드
export function getTableLogLeaderboard(limit: number = 10) {
  return fetchAPI<TableLogLeaderboard[]>(
    `/table-logs/leaderboard?limit=${limit}`,
  );
}

// 월간 식탁 리더보드 (이용시간 + 방문횟수)
export interface MonthlyLeaderboardEntry {
  discordId: string;
  userId?: string;
  username: string;
  totalMinutes: number;
  visitCount: number;
  uniqueDays: number;
}

export interface MonthlyLeaderboard {
  year: number;
  month: number;
  timeLeaderboard: MonthlyLeaderboardEntry[];
  visitLeaderboard: MonthlyLeaderboardEntry[];
}

export function getMonthlyLeaderboard(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.append('year', String(year));
  if (month) params.append('month', String(month));
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchAPI<MonthlyLeaderboard>(
    `/table-logs/monthly-leaderboard${query}`,
  );
}

// 디깅 공개 목록 (페이지네이션)
export interface DiggingPublic {
  id: string;
  url: string;
  title?: string;
  description: string;
  thumbnail?: string | null;
  hashtags: string[];
  createdAt: string;
  user: { id: string; username: string };
}

export interface DiggingPublicResponse {
  data: DiggingPublic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function getPublicDiggings(page = 1, limit = 20, hashtag?: string) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (hashtag) params.append('hashtag', hashtag);
  return fetchAPI<DiggingPublicResponse>(
    `/digging/public?${params.toString()}`,
  );
}

// ——— BoogiOut (부깃아웃) ———
export type BoogiOutCostMode = 'TOTAL' | 'PER_PERSON';
export type BoogiOutSettlementMode = 'COMMISSION' | 'COIN_GAIN';
export type BoogiOutTimeMode = 'CONFIRMED' | 'SET_TOGETHER';
export type BoogiOutEventStatus =
  | 'STANDBY'
  | 'IN_PROGRESS'
  | 'CLOSED_REGISTRATION'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BoogiOutListItem {
  id: string;
  title: string;
  description: string;
  location: string;
  status: BoogiOutEventStatus;
  timeMode: BoogiOutTimeMode;
  eventDate: string | null;
  promotionalImageUrl: string | null;
  createdAt: string;
  creator: { id: string; username: string };
  _count: { applications: number };
}

export interface BoogiOutDetail extends BoogiOutListItem {
  expectedPrice: number;
  demandParticipants: number;
  viewerIsPlanner: boolean;
  /** 기획자·관리자 전용: 취소 제외 현재 신청 수(planner expectedPrice 산정에 사용) */
  activeApplicantCount?: number;
  maxParticipants: number | null;
  targetHeadcount: number | null;
  dateSelectionMockupUrl: string | null;
  applicantResponseEnabled: boolean;
  applicantResponseLabel: string | null;
  afterPartyEnabled: boolean;
  afterPartyBudgetPerPerson: number | null;
  reminder3dAt: string | null;
  registrationClosesAt: string | null;
  registrationClosedAt?: string | null;
  /** 기획자·관리자에게만 포함 */
  costMode?: BoogiOutCostMode;
  costAmount?: number;
  feePercent?: number;
  settlementMode?: BoogiOutSettlementMode;
  commissionBankName?: string | null;
  commissionAccountNumber?: string | null;
  paymentLink?: string | null;
  afterPartyTotalAmount?: number | null;
  afterPartyBankName?: string | null;
  afterPartyAccountNumber?: string | null;
  afterPartySettledAt?: string | null;
}

export interface BoogiOutApplicationRow {
  id: string;
  userId: string;
  responseText: string | null;
  afterPartyOptIn: boolean | null;
  status: string;
  proofToken: string;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; username: string };
}

export function getBoogiOutList() {
  return fetchAPI<BoogiOutListItem[]>('/boogi-out');
}

export interface BoogiOutCertificateRow {
  eventId: string;
  eventTitle: string;
  location: string;
  eventDate: string | null;
  proofToken: string;
  paidAt: string | null;
  eventStatus: string;
}

export function getMyBoogiOutCertificates() {
  return fetchAPI<BoogiOutCertificateRow[]>('/boogi-out/my-certificates');
}

export function getBoogiOut(id: string) {
  return fetchAPI<BoogiOutDetail>(`/boogi-out/${id}`);
}

/** 멀티파트 업로드 — 반환 url을 create 시 promotionalImageUrl로 사용 */
export async function uploadBoogiOutPromoImage(
  file: File,
): Promise<{ url: string }> {
  const token = localStorage.getItem('auth_token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/boogi-out/upload-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    handleTokenExpired();
    throw new Error('Token expired');
  }
  if (!res.ok) {
    let msg = `업로드 실패 (${res.status})`;
    try {
      const text = await res.text();
      const j = JSON.parse(text) as { message?: string | string[] };
      if (j.message) {
        msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message);
      }
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<{ url: string }>;
}

export function createBoogiOut(payload: {
  title: string;
  description: string;
  location: string;
  costMode: BoogiOutCostMode;
  costAmount: number;
  settlementMode: BoogiOutSettlementMode;
  demandParticipants: number;
  commissionBankName?: string;
  commissionAccountNumber?: string;
  maxParticipants?: number;
  timeMode: BoogiOutTimeMode;
  eventDate?: string;
  targetHeadcount?: number;
  dateSelectionMockupUrl?: string;
  applicantResponseEnabled: boolean;
  applicantResponseLabel?: string;
  afterPartyEnabled: boolean;
  afterPartyBudgetPerPerson?: number;
  promotionalImageUrl?: string;
}) {
  return fetchAPI<BoogiOutDetail>('/boogi-out', 'POST', payload);
}

export function closeBoogiOutRegistrations(eventId: string) {
  return fetchAPI<BoogiOutDetail>(
    `/boogi-out/${eventId}/close-registrations`,
    'POST',
  );
}

export function cancelMyBoogiOutApplication(eventId: string) {
  return fetchAPI<{ id: string; status: string }>(
    `/boogi-out/${eventId}/my-application`,
    'DELETE',
  );
}

export function calculateBoogiOutPreview(params: {
  costMode: BoogiOutCostMode;
  costAmount: number;
  participantCount: number;
  feePercent?: number;
}) {
  const q = new URLSearchParams({
    costMode: params.costMode,
    costAmount: String(params.costAmount),
    participantCount: String(params.participantCount),
  });
  if (params.feePercent != null) {
    q.set('feePercent', String(params.feePercent));
  }
  return fetchAPI<{
    feePercent: number;
    perPerson: number;
    perPersonIfTenApplicants: number;
    totalWithFee: number;
  }>(`/boogi-out/calculate-preview?${q.toString()}`);
}

export function applyBoogiOut(
  eventId: string,
  body: { responseText?: string; afterPartyOptIn?: boolean },
) {
  return fetchAPI<{ id: string }>(`/boogi-out/${eventId}/apply`, 'POST', body);
}

export function confirmBoogiOutDate(eventId: string, eventDate: string) {
  return fetchAPI<BoogiOutDetail>(`/boogi-out/${eventId}/confirm-date`, 'POST', {
    eventDate,
  });
}

export function settleBoogiOutAfterParty(
  eventId: string,
  body: { totalAmount: number; bankName: string; accountNumber: string },
) {
  return fetchAPI<{ each: number; recipientCount: number }>(
    `/boogi-out/${eventId}/after-party`,
    'PATCH',
    body,
  );
}

export function confirmBoogiOutPayment(eventId: string) {
  return fetchAPI<{ id: string }>(`/boogi-out/${eventId}/confirm-payment`, 'POST');
}

export function getMyBoogiOutApplication(eventId: string) {
  return fetchAPI<BoogiOutApplicationRow | null>(`/boogi-out/${eventId}/me`);
}

export function getBoogiOutApplicationsForPlanner(eventId: string) {
  return fetchAPI<BoogiOutApplicationRow[]>(`/boogi-out/${eventId}/applications`);
}

export async function getBoogiOutProofPublic(eventId: string, token: string) {
  const url = `${API_BASE_URL}/boogi-out/${eventId}/proof/${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`증명 페이지를 불러올 수 없습니다 (${res.status})`);
  }
  return res.json() as Promise<{
    eventTitle: string;
    location: string;
    eventDate: string | null;
    username: string;
    paidAt: string | null;
  }>;
}

// 날짜+시간 포맷 유틸리티 (한국 시간대)
export function formatDateTime(
  date: string | Date,
  includeTime = true,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return d.toLocaleString('ko-KR', options);
}

// 날짜만 포맷 (시간 제외)
export function formatDate(date: string | Date): string {
  return formatDateTime(date, false);
}
