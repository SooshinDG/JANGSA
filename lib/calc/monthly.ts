import type {
  AppSettings,
  BestSalesDay,
  ChannelFeeBreakdown,
  ChannelKey,
  ChannelSalesBreakdown,
  ChannelShareBreakdown,
  DailyComputedMetrics,
  DailyEntry,
  MonthlyComputedMetrics,
} from "@/types";
import { CHANNEL_KEYS } from "@/lib/constants/channels";
import { clampMinZero, toSafeNumber } from "./helpers";
import {
  computeDailyMetrics,
  computeDailyMetricsList,
  createEmptyDailyMetrics,
  createZeroChannelRecord,
} from "./daily";

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

/* ------------------------------------------------------------------ */
/* month / date 키 유틸                                                */
/* ------------------------------------------------------------------ */

/**
 * 느슨한 값을 "YYYY-MM" 키로 정규화한다.
 * - 이미 "YYYY-MM" 이면 그대로
 * - "YYYY-MM-DD..." 이면 앞 7자만
 * - 그 외는 빈 문자열
 */
export function ensureMonthKey(value: string | undefined | null): string {
  if (!value) return "";
  if (MONTH_REGEX.test(value)) return value;
  if (DATE_REGEX.test(value)) return value.slice(0, 7);
  return "";
}

/** "YYYY-MM-DD" 가 month 에 속하는지 */
export function isSameMonth(date: string, month: string): boolean {
  return ensureMonthKey(date) === month;
}

/** "YYYY-MM" 의 전월 키 */
export function getPreviousMonthKey(month: string): string {
  if (!MONTH_REGEX.test(month)) return "";
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* 필터링 / 합계                                                        */
/* ------------------------------------------------------------------ */

/**
 * 특정 month("YYYY-MM") 의 entries 를 필터링한다.
 * entry.month 를 우선 사용하고, 비어 있으면 date 에서 보정한다.
 */
export function getEntriesForMonth(
  entries: DailyEntry[],
  month: string,
): DailyEntry[] {
  if (!month) return [];
  return entries.filter((entry) => {
    if (entry.month === month) return true;
    if (!entry.month && entry.date) return entry.date.startsWith(`${month}-`);
    return false;
  });
}

/** 월 entries 의 채널별 매출 합계 */
export function summarizeChannelSales(
  entries: DailyEntry[],
): ChannelSalesBreakdown {
  const acc = createZeroChannelRecord();
  for (const entry of entries) {
    for (const key of CHANNEL_KEYS) {
      acc[key] += clampMinZero(entry.sales?.[key]);
    }
  }
  return acc;
}

/** 월 entries 의 채널별 수수료 합계 (settings 의 feeRate 기반) */
export function summarizeChannelFees(
  entries: DailyEntry[],
  settings: AppSettings,
): ChannelFeeBreakdown {
  const acc = createZeroChannelRecord();
  for (const entry of entries) {
    const daily = computeDailyMetrics(entry, settings);
    for (const key of CHANNEL_KEYS) {
      acc[key] += daily.channelFees[key];
    }
  }
  return acc;
}

/** settings 의 월 고정비 합계 (항목별 음수 방어) */
export function computeFixedCostTotal(settings: AppSettings): number {
  const fc = settings?.fixedCosts;
  if (!fc) return 0;
  return (
    clampMinZero(fc.rent) +
    clampMinZero(fc.labor) +
    clampMinZero(fc.utilities) +
    clampMinZero(fc.marketing) +
    clampMinZero(fc.misc)
  );
}

/* ------------------------------------------------------------------ */
/* 개별 지표 계산 함수                                                  */
/* ------------------------------------------------------------------ */

/** 목표 달성률 (%) */
export function computeTargetAchievementRate(
  grossSales: number,
  targetSales: number,
): number {
  const target = toSafeNumber(targetSales);
  if (target <= 0) return 0;
  return (toSafeNumber(grossSales) / target) * 100;
}

/**
 * 손익분기점 매출.
 * contributionMarginRate > 0 인 경우에만 계산, 아니면 null.
 */
export function computeBepSales(
  netSales: number,
  totalVariableCost: number,
  totalFixedCost: number,
): number | null {
  const ns = toSafeNumber(netSales);
  if (ns <= 0) return null;
  const cm = ns - toSafeNumber(totalVariableCost);
  const cmRate = cm / ns;
  if (cmRate <= 0) return null;
  return toSafeNumber(totalFixedCost) / cmRate;
}

/** 전월 대비 성장률 (%) */
export function computeMonthOverMonthGrowthRate(
  currentGrossSales: number,
  previousGrossSales: number,
): number {
  const prev = toSafeNumber(previousGrossSales);
  if (prev <= 0) return 0;
  const curr = toSafeNumber(currentGrossSales);
  return ((curr - prev) / prev) * 100;
}

/**
 * 특정 월의 최고 매출일.
 * 데이터가 없으면 null.
 */
export function getBestSalesDay(
  entries: DailyEntry[],
  settings: AppSettings,
  month: string,
): BestSalesDay | null {
  const monthEntries = getEntriesForMonth(entries, month);
  if (monthEntries.length === 0) return null;

  let bestDate: string | null = null;
  let bestAmount = -1;
  for (const entry of monthEntries) {
    const daily = computeDailyMetrics(entry, settings);
    if (daily.grossSales > bestAmount) {
      bestAmount = daily.grossSales;
      bestDate = entry.date;
    }
  }
  if (bestDate === null || bestAmount < 0) return null;
  return { date: bestDate, amount: bestAmount };
}

/* ------------------------------------------------------------------ */
/* 월별 집계                                                            */
/* ------------------------------------------------------------------ */

/** 데이터가 전혀 없는 월을 나타내는 빈 MonthlyComputedMetrics */
export function createEmptyMonthlyMetrics(
  month: string,
): MonthlyComputedMetrics {
  return {
    month,
    totalDaysWithData: 0,
    grossSales: 0,
    netSales: 0,
    totalChannelFee: 0,
    totalIngredientCost: 0,
    totalPackagingCost: 0,
    totalAdCost: 0,
    totalExtraVariableCost: 0,
    totalVariableCost: 0,
    operatingProfitBeforeFixed: 0,
    totalFixedCost: 0,
    finalNetProfit: 0,
    targetSales: 0,
    targetAchievementRate: 0,
    bestSalesDate: null,
    bestSalesAmount: 0,
    bepSales: null,
    contributionMargin: 0,
    contributionMarginRate: 0,
    channelSales: createZeroChannelRecord(),
    channelFees: createZeroChannelRecord(),
    channelSalesShare: createZeroChannelRecord(),
    monthOverMonthGrowthRate: 0,
  };
}

/**
 * 특정 월의 월별 집계 지표.
 *
 * @param entries - 전체 entries 목록 (내부에서 month 로 필터)
 * @param settings - AppSettings (수수료율/원가율/목표/고정비)
 * @param month - "YYYY-MM"
 * @param previousMonthEntries - 전월 성장률 계산용 (옵션).
 *        넘기지 않으면 `entries` 배열에서 전월 키로 다시 필터한다.
 */
export function computeMonthlyMetrics(
  entries: DailyEntry[],
  settings: AppSettings,
  month: string,
  previousMonthEntries?: DailyEntry[],
): MonthlyComputedMetrics {
  const base = createEmptyMonthlyMetrics(month);
  base.totalFixedCost = computeFixedCostTotal(settings);
  base.targetSales = clampMinZero(settings?.goalSettings?.salesTarget);

  const monthEntries = getEntriesForMonth(entries, month);

  // 데이터가 없어도 totalFixedCost / targetSales / finalNetProfit 등은 계산한다.
  if (monthEntries.length === 0) {
    base.finalNetProfit = 0 - base.totalFixedCost;
    return base;
  }

  const dailyList: DailyComputedMetrics[] = computeDailyMetricsList(
    monthEntries,
    settings,
  );

  let grossSales = 0;
  let netSales = 0;
  let totalChannelFee = 0;
  let totalIngredientCost = 0;
  let totalPackagingCost = 0;
  let totalAdCost = 0;
  let totalExtraVariableCost = 0;
  let totalVariableCost = 0;
  let operatingProfitBeforeFixed = 0;

  const channelSales: ChannelSalesBreakdown = createZeroChannelRecord();
  const channelFees: ChannelFeeBreakdown = createZeroChannelRecord();

  let bestDate: string | null = null;
  let bestAmount = -1;

  for (const daily of dailyList) {
    grossSales += daily.grossSales;
    netSales += daily.netSales;
    totalChannelFee += daily.totalChannelFee;
    totalIngredientCost += daily.ingredientCost;
    totalPackagingCost += daily.packagingCost;
    totalAdCost += daily.dailyAdCost;
    totalExtraVariableCost += daily.extraVariableCost;
    totalVariableCost += daily.totalVariableCost;
    operatingProfitBeforeFixed += daily.operatingProfitBeforeFixed;

    for (const key of CHANNEL_KEYS) {
      channelSales[key] += daily.channelSales[key];
      channelFees[key] += daily.channelFees[key];
    }

    if (daily.grossSales > bestAmount) {
      bestAmount = daily.grossSales;
      bestDate = daily.date;
    }
  }

  const contributionMargin = netSales - totalVariableCost;
  const contributionMarginRate = netSales > 0 ? contributionMargin / netSales : 0;
  const bepSales =
    contributionMarginRate > 0
      ? base.totalFixedCost / contributionMarginRate
      : null;

  const finalNetProfit = operatingProfitBeforeFixed - base.totalFixedCost;

  const channelSalesShare: ChannelShareBreakdown = createZeroChannelRecord();
  if (grossSales > 0) {
    for (const key of CHANNEL_KEYS) {
      channelSalesShare[key] = channelSales[key] / grossSales;
    }
  }

  const targetAchievementRate = computeTargetAchievementRate(
    grossSales,
    base.targetSales,
  );

  // MoM 성장률
  let monthOverMonthGrowthRate = 0;
  const prevMonthKey = getPreviousMonthKey(month);
  if (prevMonthKey) {
    const prevEntries =
      previousMonthEntries ?? getEntriesForMonth(entries, prevMonthKey);
    if (prevEntries.length > 0) {
      const prevDaily = computeDailyMetricsList(prevEntries, settings);
      let prevGross = 0;
      for (const d of prevDaily) prevGross += d.grossSales;
      monthOverMonthGrowthRate = computeMonthOverMonthGrowthRate(
        grossSales,
        prevGross,
      );
    }
  }

  return {
    month,
    totalDaysWithData: dailyList.length,
    grossSales,
    netSales,
    totalChannelFee,
    totalIngredientCost,
    totalPackagingCost,
    totalAdCost,
    totalExtraVariableCost,
    totalVariableCost,
    operatingProfitBeforeFixed,
    totalFixedCost: base.totalFixedCost,
    finalNetProfit,
    targetSales: base.targetSales,
    targetAchievementRate,
    bestSalesDate: bestDate,
    bestSalesAmount: bestDate ? bestAmount : 0,
    bepSales,
    contributionMargin,
    contributionMarginRate,
    channelSales,
    channelFees,
    channelSalesShare,
    monthOverMonthGrowthRate,
  };
}

/* ------------------------------------------------------------------ */
/* Today / Current-Month 스냅샷                                         */
/* ------------------------------------------------------------------ */

function normalizeToday(today?: Date): Date {
  return today instanceof Date && !Number.isNaN(today.getTime())
    ? today
    : new Date();
}

/** Date → "YYYY-MM-DD" */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date → "YYYY-MM" */
function toMonthKeyFromDate(d: Date): string {
  return toDateKey(d).slice(0, 7);
}

/**
 * 오늘 날짜 기준 일별 지표.
 * 오늘에 해당하는 entry 가 없으면 0 기반 빈 결과.
 * `today` 를 넘겨 테스트 가능하게 사용할 수 있다.
 */
export function getTodayMetrics(
  entries: DailyEntry[],
  settings: AppSettings,
  today?: Date,
): DailyComputedMetrics {
  const now = normalizeToday(today);
  const date = toDateKey(now);
  const month = date.slice(0, 7);
  const entry = entries.find((e) => e.date === date);
  if (!entry) return createEmptyDailyMetrics(date, month);
  return computeDailyMetrics(entry, settings);
}

/**
 * 현재 달 기준 월별 지표.
 * `today` 를 넘기면 해당 시점의 월을 사용한다.
 */
export function getCurrentMonthMetrics(
  entries: DailyEntry[],
  settings: AppSettings,
  today?: Date,
): MonthlyComputedMetrics {
  const now = normalizeToday(today);
  const month = toMonthKeyFromDate(now);
  return computeMonthlyMetrics(entries, settings, month);
}
