import type { ChannelKey } from "@/lib/constants/channels";

/**
 * 앱 전역 타입 정의.
 * Unit 02 기준으로 원본 데이터 형태만 정의하며,
 * 계산 결과 타입은 이후 단계에서 별도로 추가한다.
 */

export type { ChannelKey };

export type ChannelSales = Record<ChannelKey, number>;

/** 채널 개별 설정 */
export interface ChannelSettings {
  label: string;
  enabled: boolean;
  /** 수수료율 (%) */
  feeRate: number;
}

/** 월 고정비 */
export interface FixedCosts {
  rent: number;
  labor: number;
  utilities: number;
  marketing: number;
  misc: number;
}

/** 목표 설정 */
export interface GoalSettings {
  /** 월 목표 매출 (원) */
  salesTarget: number;
}

/** 원가 규칙 */
export interface CostSettings {
  /** 식자재 원가율 (%) */
  ingredientCostRate: number;
  /** 포장비율 (%) */
  packagingCostRate: number;
}

/** 앱 전체 설정 */
export interface AppSettings {
  channels: Record<ChannelKey, ChannelSettings>;
  costRules: CostSettings;
  goalSettings: GoalSettings;
  fixedCosts: FixedCosts;
  currency: string;
}

/** 일별 매출 입력 엔트리 (원본 데이터) */
export interface DailyEntry {
  /** 고유 id (date 또는 uuid 기반). 저장/업서트의 기본 키. */
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM — 조회 최적화용 */
  month: string;
  /** 채널별 매출 (원) */
  sales: ChannelSales;
  /** 환불 금액 (원) */
  refundAmount: number;
  /** 일별 광고비 (원) */
  dailyAdCost: number;
  /** 기타 변동비 (원) */
  extraVariableCost: number;
  memo?: string;
  createdAt: number;
  updatedAt: number;
}

/** 앱 메타 / 버전 정보 */
export interface AppMeta {
  initializedAt: number;
  updatedAt: number;
  version: number;
}

/* ------------------------------------------------------------------ */
/* 계산 엔진 결과 타입 (Unit 03)                                      */
/* 원본 데이터(AppSettings / DailyEntry)는 그대로 두고,                */
/* 아래 타입들은 `lib/calc` 순수 함수가 돌려주는 derive 결과다.        */
/* ------------------------------------------------------------------ */

/** 채널별 매출 합계 */
export type ChannelSalesBreakdown = Record<ChannelKey, number>;

/** 채널별 수수료 합계 */
export type ChannelFeeBreakdown = Record<ChannelKey, number>;

/** 채널별 비중 (0..1 ratio, 퍼센트 아님) */
export type ChannelShareBreakdown = Record<ChannelKey, number>;

/** 일별 계산 결과 */
export interface DailyComputedMetrics {
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM */
  month: string;
  /** 채널 합계 매출 */
  grossSales: number;
  /** 환불 차감 후 매출 (>=0) */
  netSales: number;
  /** 채널별 원시 매출 */
  channelSales: ChannelSalesBreakdown;
  /** 채널별 수수료 */
  channelFees: ChannelFeeBreakdown;
  /** 수수료 합 */
  totalChannelFee: number;
  /** 식자재 원가 */
  ingredientCost: number;
  /** 포장비 */
  packagingCost: number;
  /** 일별 광고비 (입력값 스냅샷) */
  dailyAdCost: number;
  /** 기타 변동비 (입력값 스냅샷) */
  extraVariableCost: number;
  /** 변동비 총합 */
  totalVariableCost: number;
  /** 고정비 차감 전 영업이익 (음수 가능) */
  operatingProfitBeforeFixed: number;
}

/** 최고 매출일 정보 */
export interface BestSalesDay {
  date: string;
  amount: number;
}

/** 월별 계산 결과 */
export interface MonthlyComputedMetrics {
  /** YYYY-MM */
  month: string;
  /** 해당 월에 데이터가 존재하는 일수 */
  totalDaysWithData: number;

  grossSales: number;
  netSales: number;

  totalChannelFee: number;
  totalIngredientCost: number;
  totalPackagingCost: number;
  totalAdCost: number;
  totalExtraVariableCost: number;
  totalVariableCost: number;

  /** 고정비 차감 전 영업이익 합 */
  operatingProfitBeforeFixed: number;
  /** 월 고정비 합 */
  totalFixedCost: number;
  /** 최종 순이익 (= operatingProfitBeforeFixed - totalFixedCost, 음수 가능) */
  finalNetProfit: number;

  /** 목표 매출 (설정값) */
  targetSales: number;
  /** 목표 달성률 (%) */
  targetAchievementRate: number;

  /** 최고 매출일 날짜 (없으면 null) */
  bestSalesDate: string | null;
  /** 최고 매출일 금액 (없으면 0) */
  bestSalesAmount: number;

  /** 손익분기점 매출 (계산 불가 시 null) */
  bepSales: number | null;
  /** 공헌이익 (netSales - totalVariableCost) */
  contributionMargin: number;
  /** 공헌이익률 (0..1) */
  contributionMarginRate: number;

  /** 채널별 월 매출 합 */
  channelSales: ChannelSalesBreakdown;
  /** 채널별 월 수수료 합 */
  channelFees: ChannelFeeBreakdown;
  /** 채널별 매출 비중 (0..1) */
  channelSalesShare: ChannelShareBreakdown;

  /** 전월 대비 매출 성장률 (%) */
  monthOverMonthGrowthRate: number;
}

/** 대시보드 1회 스냅샷 */
export interface DashboardSnapshot {
  today: DailyComputedMetrics;
  currentMonth: MonthlyComputedMetrics;
  /** 스냅샷 생성 시각 (epoch ms) */
  generatedAt: number;
}
