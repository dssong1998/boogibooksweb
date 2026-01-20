const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  const userStr = localStorage.getItem("user");
  let userId: string | undefined;

  if (userStr) {
    try {
      const parsed = JSON.parse(userStr) as { id?: string };
      userId = parsed.id;
    } catch {
      userId = undefined;
    }
  }

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "x-user-id": userId } : {}),
  };
}

async function fetchAPI<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type EventType = "MEETING" | "DIGGING_CLUB" | "ONLINE" | "OTHER";

export interface EventData {
  id: string;
  title: string;
  content?: string | null;
  date?: string | null;
  location?: string | null;
  eventType?: EventType;
  price?: number;
  capacity?: number | null;
  maxParticipants?: number | null;
  applications?: { id: string }[] | null; // 신청자 목록
}

export interface BookData {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  coverUrl?: string | null;
  description?: string | null;
}

export type CommentType = "PREVIEW" | "REVIEW" | "QUOTE";

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
  description?: string | null;
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

export function getEvents() {
  return fetchAPI<EventData[]>("/events");
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
  return fetchAPI<EventData>("/events", "POST", payload);
}

export function updateEvent(id: string, payload: Partial<EventData>) {
  return fetchAPI<EventData>(`/events/${id}`, "PATCH", payload);
}

export function deleteEvent(id: string) {
  return fetchAPI<void>(`/events/${id}`, "DELETE");
}

// 이벤트 신청 관련 API
export interface EventEligibility {
  eligible: boolean;
  reason?: string;
  currentOrder: number;
  maxParticipants: number;
  isOverCapacity: boolean;
  requiredCoins: number;
  userCoins: number;
  price: number;
  eventType: string;
  isTerras: boolean;
  isFree: boolean;
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
  return fetchAPI<EventApplicationResult>(`/events/${eventId}/apply`, "POST", { useCoins });
}

export function confirmEventPayment(eventId: string, userId?: string) {
  return fetchAPI<{ success: boolean; message: string }>(
    `/events/${eventId}/confirm-payment`, 
    "POST",
    userId ? { userId } : undefined
  );
}

// 사용자 정보 조회 (공개 API - 토큰 불필요)
export function getUserById(userId: string) {
  return fetchAPI<{ id: string; username: string; discordId: string; isTerras: boolean }>(`/users/${userId}`);
}

export function cancelEventApplication(eventId: string) {
  return fetchAPI<{ success: boolean; message: string; refundedCoins: number }>(`/events/${eventId}/cancel`, "DELETE");
}

export function searchBooks(query: string) {
  return fetchAPI<{ items: NaverBookItem[] }>(
    `/books/search?query=${encodeURIComponent(query)}`,
  );
}

export function getBooks() {
  return fetchAPI<BookData[]>("/books");
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
  return fetchAPI<BookData>("/books", "POST", payload);
}

export function updateBook(id: string, payload: Partial<BookData>) {
  return fetchAPI<BookData>(`/books/${id}`, "PATCH", payload);
}

export function deleteBook(id: string) {
  return fetchAPI<void>(`/books/${id}`, "DELETE");
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
  return fetchAPI<CommentData>("/comments", "POST", payload);
}

export function getDiggings() {
  return fetchAPI<DiggingData[]>("/digging");
}

export function createDigging(payload: { url: string; description?: string }) {
  return fetchAPI<DiggingData>("/digging", "POST", payload);
}

export function deleteDigging(id: string) {
  return fetchAPI<void>(`/digging/${id}`, "DELETE");
}

export function processPayment(payload: {
  eventId?: string | null;
  type?: string | null;
  coins: number;
}) {
  return fetchAPI<void>("/payments", "POST", payload);
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
  type: "MEETING" | "SHELLCAST" | "DIGGING_CLUB" | "MOVIE_NIGHT" | "BOOGITOUT";
}

// Admin: Events
export function createAdminEvent(payload: {
  title: string;
  content?: string;
  date: string;
  location: string;
  maxParticipants: number;
  requiredCoins?: number;
}) {
  return fetchAPI<EventData>("/admin/events", "POST", payload);
}

export function getAdminEvents() {
  return fetchAPI<EventData[]>("/admin/events");
}

export function updateAdminEvent(id: string, payload: Partial<EventData>) {
  return fetchAPI<EventData>(`/admin/events/${id}`, "PATCH", payload);
}

export function deleteAdminEvent(id: string) {
  return fetchAPI<void>(`/admin/events/${id}`, "DELETE");
}

// Admin: Event Applications
export interface EventApplicationData {
  id: string;
  eventId: string;
  userId: string;
  applicationOrder: number;
  status: "PENDING" | "APPROVED" | "CONFIRMED" | "COIN_GUARANTEED" | "CANCELLED";
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

export function approveEventApplications(eventId: string, applicationIds: string[]) {
  return fetchAPI<{
    approved: number;
    coinRefunded: { userId: string; coins: number; discordId: string }[];
    dmSent: number;
  }>(`/events/${eventId}/approve`, "POST", { applicationIds });
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
  return fetchAPI<MonthlyBookData>("/admin/monthly-book", "POST", payload);
}

export function getAdminMonthlyBooks() {
  return fetchAPI<MonthlyBookData[]>("/admin/monthly-book");
}

export function getCurrentMonthlyBooks() {
  return fetchAPI<MonthlyBookData[]>("/admin/monthly-book/current");
}

export function getMonthlyBooks(year: number, month: number) {
  return fetchAPI<MonthlyBookData[]>(`/admin/monthly-book/${year}/${month}`);
}

export function deleteAdminMonthlyBook(id: string) {
  return fetchAPI<void>(`/admin/monthly-book/${id}`, "DELETE");
}

// Admin: Schedule
export function createAdminSchedule(payload: {
  title: string;
  description?: string;
  date: string;
  time?: string;
  type?: "MEETING" | "SHELLCAST" | "DIGGING_CLUB" | "MOVIE_NIGHT" | "BOOGITOUT";
}) {
  return fetchAPI<ScheduleData>("/admin/schedule", "POST", payload);
}

export function getAdminSchedules() {
  return fetchAPI<ScheduleData[]>("/admin/schedule");
}

export function getWeekSchedules() {
  return fetchAPI<ScheduleData[]>("/admin/schedule/week");
}

export function getMonthSchedules(year: number, month: number) {
  return fetchAPI<ScheduleData[]>(`/admin/schedule/month/${year}/${month}`);
}

export function updateAdminSchedule(id: string, payload: Partial<ScheduleData>) {
  return fetchAPI<ScheduleData>(`/admin/schedule/${id}`, "PATCH", payload);
}

export function deleteAdminSchedule(id: string) {
  return fetchAPI<void>(`/admin/schedule/${id}`, "DELETE");
}

// TableLog (식탁 방명록) 관련
export interface TableLogStats {
  totalDays: number;      // 총 참여 일수
  totalLogs: number;      // 총 로그 수
  monthlyStats: {
    month: string;        // "2026-01" 형식
    count: number;
  }[];
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
  return fetchAPI<TableLogStats>("/table-logs/stats");
}

// 월별 전체 통계 (관리자용)
export function getTableLogMonthly(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.append("year", String(year));
  if (month) params.append("month", String(month));
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<TableLogMonthly>(`/table-logs/monthly${query}`);
}

// 식탁 리더보드
export function getTableLogLeaderboard(limit: number = 10) {
  return fetchAPI<TableLogLeaderboard[]>(`/table-logs/leaderboard?limit=${limit}`);
}
