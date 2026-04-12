/**
 * 날짜 / 월 관련 유틸.
 * 이후 단계에서 월별 정산, 일자 순회 등에 사용된다.
 */

export type YearMonth = `${number}-${string}`;

export function toYearMonth(date: Date): YearMonth {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}` as YearMonth;
}

export function currentYearMonth(): YearMonth {
  return toYearMonth(new Date());
}

export function formatKoreanMonth(ym: YearMonth): string {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

export function daysInMonth(ym: YearMonth): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "YYYY-MM" 의 모든 날짜를 "YYYY-MM-DD" 문자열 배열로 반환.
 * 잘못된 포맷이 들어오면 빈 배열.
 */
export function getDatesInMonth(month: string): string[] {
  if (!MONTH_RE.test(month)) return [];
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const result: string[] = [];
  for (let d = 1; d <= last; d++) {
    result.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  return result;
}

/** "YYYY-MM-DD" 가 오늘 날짜인지 */
export function isTodayDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return date === today;
}

/** "YYYY-MM-DD" 가 토/일인지 */
export function isWeekendDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
}

/** "YYYY-MM-DD" → 요일 (0=일 ~ 6=토). 잘못된 포맷이면 -1 */
export function getDayOfWeek(date: string): number {
  if (!DATE_RE.test(date)) return -1;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
