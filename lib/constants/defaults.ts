import type { ChannelKey } from "./channels";

/**
 * 앱 기본값 상수.
 * 실제 AppSettings 객체는 `lib/utils/default-state.ts` 에서 이 값들을
 * 조합해 만들고, Provider 초기화 시점에 IndexedDB에 주입된다.
 */

export const APP_VERSION = 1;
export const APP_DB_NAME = "jangsa-db";
export const APP_CURRENCY = "KRW";

export const SETTINGS_KEY = "app-settings" as const;
export const META_KEY = "app-meta" as const;

/** 채널 기본 수수료율 (%) */
export const DEFAULT_FEE_RATE: Record<ChannelKey, number> = {
  baemin: 6.8,
  yogiyo: 12.5,
  coupang: 9.8,
  pos: 0,
};

/** 채널 기본 라벨 */
export const DEFAULT_CHANNEL_LABEL: Record<ChannelKey, string> = {
  baemin: "배달의민족",
  yogiyo: "요기요",
  coupang: "쿠팡이츠",
  pos: "POS (홀/포장)",
};

/** 원가 규칙 기본값 (%) */
export const DEFAULT_COST_RULES = {
  ingredientCostRate: 35,
  packagingCostRate: 2,
} as const;

/** 월 목표 매출 기본값 (원) */
export const DEFAULT_GOAL = {
  salesTarget: 30_000_000,
} as const;

/** 월 고정비 기본값 (원) */
export const DEFAULT_FIXED_COSTS = {
  rent: 2_000_000,
  labor: 2_500_000,
  utilities: 300_000,
  marketing: 200_000,
  misc: 0,
} as const;
