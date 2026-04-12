import type { AppSettings, DailyEntry } from "@/types";
import { computeDailyMetricsList, getEntriesForMonth } from "@/lib/calc";

/**
 * CSV 생성 유틸.
 * 계산값은 저장하지 않고, export 시점에 `computeDailyMetricsList` 로 계산한다.
 */

/**
 * CSV 셀 값 escape.
 * 쉼표 / 따옴표 / 줄바꿈이 포함된 경우 큰따옴표로 감싸고 내부 큰따옴표를 두 번으로 치환.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS: readonly string[] = [
  "날짜",
  "배민",
  "요기요",
  "쿠팡이츠",
  "POS",
  "환불/취소",
  "광고비",
  "기타변동비",
  "총매출",
  "순매출",
  "총수수료",
  "원가",
  "포장비",
  "일 순이익",
  "메모",
];

/**
 * 월별 정산 CSV 생성.
 * 해당 월에 entries 가 없으면 빈 문자열을 반환한다.
 * 값은 숫자 그대로 기록하고, 통화 포맷(₩/콤마)은 적용하지 않는다.
 */
export function buildMonthlySettlementCsv(
  entries: DailyEntry[],
  settings: AppSettings,
  month: string,
): string {
  const monthEntries = getEntriesForMonth(entries, month);
  if (monthEntries.length === 0) return "";

  // computeDailyMetricsList 가 내부에서 date 오름차순 정렬을 보장한다
  const metricsList = computeDailyMetricsList(monthEntries, settings);
  const entryByDate = new Map(monthEntries.map((e) => [e.date, e]));

  const lines: string[] = [];
  lines.push(CSV_HEADERS.map(escapeCsvCell).join(","));

  for (const m of metricsList) {
    const entry = entryByDate.get(m.date);
    const row: Array<string | number> = [
      m.date,
      m.channelSales.baemin,
      m.channelSales.yogiyo,
      m.channelSales.coupang,
      m.channelSales.pos,
      entry?.refundAmount ?? 0,
      m.dailyAdCost,
      m.extraVariableCost,
      m.grossSales,
      m.netSales,
      m.totalChannelFee,
      m.ingredientCost,
      m.packagingCost,
      m.operatingProfitBeforeFixed,
      entry?.memo ?? "",
    ];
    lines.push(row.map(escapeCsvCell).join(","));
  }

  // 엑셀 호환성을 위해 CRLF 사용
  return lines.join("\r\n");
}
