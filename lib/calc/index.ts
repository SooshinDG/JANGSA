/**
 * 계산 엔진 barrel export.
 *
 * 사용 예:
 *   import {
 *     computeDailyMetrics,
 *     computeMonthlyMetrics,
 *     getCurrentMonthMetrics,
 *   } from "@/lib/calc";
 *
 * 이 모듈은 React / Dexie / DOM 에 의존하지 않는 순수 함수만 노출한다.
 */

export * from "./helpers";
export * from "./daily";
export * from "./monthly";
