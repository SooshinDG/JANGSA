/**
 * 계산 엔진 공용 헬퍼 (순수 함수).
 *
 * 원칙:
 * - 입력이 null / undefined / NaN / Infinity / 음수여도 앱이 깨지지 않아야 한다.
 * - 내부 계산은 number 그대로 유지하고, 포맷팅은 UI 레이어에 맡긴다.
 * - React / Dexie / DOM 에 의존하지 않는다.
 */

/** null/undefined/NaN/Infinity 를 0으로 수렴시키고 number 로 정규화 */
export function toSafeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

/** 0 미만 값을 0으로 clamp */
export function clampMinZero(value: unknown): number {
  const n = toSafeNumber(value);
  return n < 0 ? 0 : n;
}

/** 퍼센트(예: 6.8)를 ratio(0.068)로 변환. 음수/이상값은 0 처리 */
export function percentToRatio(value: unknown): number {
  return clampMinZero(value) / 100;
}

/** KRW 기준 정수 반올림 (계산 내부에서 꼭 필요할 때만 사용) */
export function roundCurrency(value: number): number {
  return Math.round(toSafeNumber(value));
}

/** 분모가 0이면 0을 반환하는 안전 나눗셈 */
export function safeDivide(numerator: number, denominator: number): number {
  const d = toSafeNumber(denominator);
  if (d === 0) return 0;
  return toSafeNumber(numerator) / d;
}
