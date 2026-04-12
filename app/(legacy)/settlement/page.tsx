"use client";

import { useMemo, useState } from "react";
import { Target, Trophy } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { MonthPicker } from "@/components/common/month-picker";
import { KpiCard } from "@/components/common/kpi-card";
import { EmptyState } from "@/components/common/empty-state";
import { DailySettlementTable } from "@/components/settlement/daily-settlement-table";
import { useAppState } from "@/hooks/useAppState";
import {
  computeDailyMetricsList,
  computeMonthlyMetrics,
  getEntriesForMonth,
} from "@/lib/calc";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import { formatKRW, formatPercent } from "@/lib/utils/currency";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatKoreanMonth(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return "";
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

function formatShortDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

export default function SettlementPage() {
  const [month, setMonth] = useState<string>(() => currentMonthKey());
  const { entries, settings, loading, error } = useAppState();

  const effectiveSettings = useMemo(
    () => settings ?? buildDefaultSettings(),
    [settings],
  );

  const monthEntries = useMemo(
    () => getEntriesForMonth(entries, month),
    [entries, month],
  );

  const dailyRows = useMemo(
    () => computeDailyMetricsList(monthEntries, effectiveSettings),
    [monthEntries, effectiveSettings],
  );

  const monthly = useMemo(
    () => computeMonthlyMetrics(entries, effectiveSettings, month),
    [entries, effectiveSettings, month],
  );

  const hasData = monthly.totalDaysWithData > 0;

  const profitAccent = loading
    ? "default"
    : monthly.finalNetProfit >= 0
      ? "positive"
      : "negative";
  const targetAccent = loading
    ? "default"
    : monthly.targetAchievementRate >= 100
      ? "positive"
      : "primary";

  return (
    <>
      <PageHeader
        title="월별 정산"
        description={`${formatKoreanMonth(month)} 매출·수수료·순이익 집계`}
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section
        aria-label="월 요약 카드"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="총매출"
          value={formatKRW(monthly.grossSales)}
          hint={
            hasData
              ? `${monthly.totalDaysWithData}일 합계`
              : loading
                ? "로컬 저장소 로드 중..."
                : "입력된 데이터 없음"
          }
        />
        <KpiCard
          label="순매출"
          value={formatKRW(monthly.netSales)}
          hint="환불 차감 후"
        />
        <KpiCard
          label="총변동비"
          value={formatKRW(monthly.totalVariableCost)}
          hint="수수료 + 원가 + 포장 + 광고 + 기타"
        />
        <KpiCard
          label="최종 순이익"
          value={formatKRW(monthly.finalNetProfit)}
          hint={`고정비 ${formatKRW(monthly.totalFixedCost)} 차감 후`}
          accent={profitAccent}
        />
      </section>

      <section
        aria-label="보조 지표"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="총수수료"
          value={formatKRW(monthly.totalChannelFee)}
          hint="채널 수수료 합계"
        />
        <KpiCard
          label="총고정비"
          value={formatKRW(monthly.totalFixedCost)}
          hint="월세·인건비·공과금·마케팅·기타"
        />
        <KpiCard
          label="목표 달성률"
          value={formatPercent(monthly.targetAchievementRate)}
          hint={`목표 ${formatKRW(monthly.targetSales)}`}
          accent={targetAccent}
          icon={<Target />}
        />
        <KpiCard
          label="최고 매출일"
          value={
            monthly.bestSalesDate
              ? formatShortDate(monthly.bestSalesDate)
              : "데이터 없음"
          }
          hint={
            monthly.bestSalesDate
              ? formatKRW(monthly.bestSalesAmount)
              : "기록된 날짜가 없습니다"
          }
          icon={<Trophy />}
        />
      </section>

      <SectionCard
        title="일별 정산표"
        description="선택한 월에 기록된 일자만 표시됩니다. 날짜 오름차순."
        footer={
          hasData
            ? `기록된 ${monthly.totalDaysWithData}일 · 합계 ${formatKRW(monthly.grossSales)}`
            : undefined
        }
      >
        {hasData ? (
          <DailySettlementTable rows={dailyRows} />
        ) : (
          <EmptyState
            title="선택한 월에 입력된 데이터가 없습니다."
            message={`${formatKoreanMonth(month)} 의 매출 입력이 추가되면 이 표에 자동으로 반영됩니다.`}
          />
        )}
      </SectionCard>
    </>
  );
}
