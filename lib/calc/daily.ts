import type {
  AppSettings,
  ChannelFeeBreakdown,
  ChannelKey,
  ChannelSalesBreakdown,
  DailyComputedMetrics,
  DailyEntry,
} from "@/types";
import { CHANNEL_KEYS } from "@/lib/constants/channels";
import { clampMinZero, percentToRatio } from "./helpers";

/**
 * 채널별 숫자 Record 를 0 으로 초기화해서 돌려준다.
 * (ChannelSalesBreakdown / ChannelFeeBreakdown / ChannelShareBreakdown 공통)
 */
export function createZeroChannelRecord(): Record<ChannelKey, number> {
  return CHANNEL_KEYS.reduce<Record<ChannelKey, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<ChannelKey, number>);
}

/** 데이터가 전혀 없는 날짜를 나타내는 빈 DailyComputedMetrics */
export function createEmptyDailyMetrics(
  date: string,
  month: string,
): DailyComputedMetrics {
  return {
    date,
    month,
    grossSales: 0,
    netSales: 0,
    channelSales: createZeroChannelRecord(),
    channelFees: createZeroChannelRecord(),
    totalChannelFee: 0,
    ingredientCost: 0,
    packagingCost: 0,
    dailyAdCost: 0,
    extraVariableCost: 0,
    totalVariableCost: 0,
    operatingProfitBeforeFixed: 0,
  };
}

/**
 * DailyEntry 1건을 계산해 일별 지표로 변환한다.
 * 이상 입력(음수 매출/NaN feeRate 등)이 와도 0 기반으로 안전하게 처리한다.
 */
export function computeDailyMetrics(
  entry: DailyEntry,
  settings: AppSettings,
): DailyComputedMetrics {
  const date = entry.date ?? "";
  const month = entry.month && entry.month.length > 0 ? entry.month : date.slice(0, 7);

  // 1) 채널별 매출 / grossSales
  const channelSales: ChannelSalesBreakdown = createZeroChannelRecord();
  let grossSales = 0;
  for (const key of CHANNEL_KEYS) {
    const s = clampMinZero(entry.sales?.[key]);
    channelSales[key] = s;
    grossSales += s;
  }

  // 2) netSales (환불 차감, 0 미만 clamp)
  const refundAmount = clampMinZero(entry.refundAmount);
  const netSales = grossSales - refundAmount < 0 ? 0 : grossSales - refundAmount;

  // 3) 채널별 수수료 / totalChannelFee
  const channelFees: ChannelFeeBreakdown = createZeroChannelRecord();
  let totalChannelFee = 0;
  for (const key of CHANNEL_KEYS) {
    const rate = percentToRatio(settings?.channels?.[key]?.feeRate);
    const fee = channelSales[key] * rate;
    channelFees[key] = fee;
    totalChannelFee += fee;
  }

  // 4) 원가 / 포장비 — netSales 기준
  const ingredientCost =
    netSales * percentToRatio(settings?.costRules?.ingredientCostRate);
  const packagingCost =
    netSales * percentToRatio(settings?.costRules?.packagingCostRate);

  // 5) 변동비 / 영업이익
  const dailyAdCost = clampMinZero(entry.dailyAdCost);
  const extraVariableCost = clampMinZero(entry.extraVariableCost);
  const totalVariableCost =
    totalChannelFee +
    ingredientCost +
    packagingCost +
    dailyAdCost +
    extraVariableCost;

  // 영업이익은 음수 허용 (적자일 수 있음)
  const operatingProfitBeforeFixed = netSales - totalVariableCost;

  return {
    date,
    month,
    grossSales,
    netSales,
    channelSales,
    channelFees,
    totalChannelFee,
    ingredientCost,
    packagingCost,
    dailyAdCost,
    extraVariableCost,
    totalVariableCost,
    operatingProfitBeforeFixed,
  };
}

/**
 * DailyEntry[] 를 date 오름차순으로 정렬하면서 일별 지표 배열로 변환한다.
 * 원본 배열은 수정하지 않는다.
 */
export function computeDailyMetricsList(
  entries: DailyEntry[],
  settings: AppSettings,
): DailyComputedMetrics[] {
  return [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((entry) => computeDailyMetrics(entry, settings));
}
