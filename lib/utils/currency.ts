/**
 * 금액 포맷 유틸 (KRW 기준)
 * 이후 단계에서 세부 계산 로직이 추가될 자리.
 */

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

export function formatKRW(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "₩0";
  }
  return KRW_FORMATTER.format(Math.round(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }
  return NUMBER_FORMATTER.format(value);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0%";
  }
  return `${value.toFixed(fractionDigits)}%`;
}
