"use client";

import { useMemo, useState } from "react";
import {
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Receipt,
  Minus,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { MonthPicker } from "@/components/common/month-picker";
import { KpiCard } from "@/components/common/kpi-card";
import { EmptyState } from "@/components/common/empty-state";
import { DailySalesChart } from "@/components/dashboard/daily-sales-chart";
import { CHANNELS } from "@/lib/constants/channels";
import { useAppState } from "@/hooks/useAppState";
import { useComputedMetrics } from "@/hooks/useComputedMetrics";
import { formatKRW, formatPercent } from "@/lib/utils/currency";
import { formatKrwCompact } from "@/lib/utils/format-krw-compact";
import { cn } from "@/lib/utils/cn";

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

export default function DashboardPage() {
  const [month, setMonth] = useState<string>(() => currentMonthKey());
  const { entries, loading, error } = useAppState();
  const { getMonthlyComputed } = useComputedMetrics();

  const monthly = useMemo(
    () => getMonthlyComputed(month),
    [getMonthlyComputed, month],
  );

  const hasData = monthly.totalDaysWithData > 0;
  const mom = monthly.monthOverMonthGrowthRate;

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

  /* 목표 달성률 진행 바 */
  const goalPct = Math.min(100, Math.max(0, monthly.targetAchievementRate));
  const goalBarColor =
    monthly.targetAchievementRate >= 100
      ? "bg-emerald-500"
      : "bg-primary";

  /* 채널별 최대 비중 (바 너비 정규화용) */
  const maxShare = Math.max(
    ...CHANNELS.map((c) => monthly.channelSalesShare[c.id] ?? 0),
    0.01,
  );

  return (
    <>
      <PageHeader
        title="대시보드"
        description={`${formatKoreanMonth(month)} 기준 주요 지표를 한눈에 확인합니다.`}
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* ── KPI 카드 ── */}
      <section
        aria-label="KPI 카드"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="이번 달 총매출"
          value={formatKrwCompact(monthly.grossSales)}
          hint={
            hasData ? (
              <span>
                <span className="font-mono">{formatKRW(monthly.grossSales)}</span>
                {" · "}
                {monthly.totalDaysWithData}일 기록
              </span>
            ) : loading ? (
              "로컬 저장소 로드 중..."
            ) : (
              "입력된 데이터 없음"
            )
          }
          icon={<Wallet />}
        />
        <KpiCard
          label="이번 달 예상 순이익"
          value={formatKrwCompact(monthly.finalNetProfit)}
          hint={
            loading ? (
              "데이터 로드 중..."
            ) : (
              <span>
                <span className="font-mono">{formatKRW(monthly.finalNetProfit)}</span>
                {" · "}
                {monthly.finalNetProfit >= 0 ? "흑자" : "적자"}
              </span>
            )
          }
          accent={profitAccent}
          icon={
            monthly.finalNetProfit >= 0 ? <TrendingUp /> : <TrendingDown />
          }
        />
        <KpiCard
          label="이번 달 총수수료"
          value={formatKrwCompact(monthly.totalChannelFee)}
          hint={
            <span className="font-mono">{formatKRW(monthly.totalChannelFee)}</span>
          }
          icon={<Receipt />}
        />
        <KpiCard
          label="목표 달성률"
          value={formatPercent(monthly.targetAchievementRate)}
          hint={`목표 ${formatKrwCompact(monthly.targetSales)}`}
          accent={targetAccent}
          icon={<Target />}
          footer={
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={Math.round(goalPct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn("h-full rounded-full transition-all duration-500", goalBarColor)}
                style={{ width: `${goalPct}%` }}
              />
            </div>
          }
        />
      </section>

      {/* ── 일별 총매출 라인 차트 ── */}
      {hasData && (
        <SectionCard
          title="일별 매출 추이"
          description={`${formatKoreanMonth(month)} · 일별 총매출`}
        >
          <DailySalesChart entries={entries} month={month} />
        </SectionCard>
      )}

      {/* ── 요약 + 채널 비중 ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="월 요약"
          description="최고 매출일 · 전월 대비 · 손익분기점"
          className="lg:col-span-2"
        >
          {hasData ? (
            <dl className="grid gap-4 sm:grid-cols-3">
              <SummaryStat
                label="최고 매출일"
                primary={
                  monthly.bestSalesDate
                    ? formatShortDate(monthly.bestSalesDate)
                    : "데이터 없음"
                }
                secondary={
                  monthly.bestSalesDate
                    ? formatKrwCompact(monthly.bestSalesAmount)
                    : undefined
                }
                secondaryDetail={
                  monthly.bestSalesDate
                    ? formatKRW(monthly.bestSalesAmount)
                    : undefined
                }
                icon={<Trophy className="h-4 w-4" />}
              />
              <SummaryStat
                label="전월 대비"
                primary={formatSignedPercent(mom)}
                secondary={
                  mom === 0
                    ? "전월 데이터 없음"
                    : mom > 0
                      ? "성장 중"
                      : "감소 중"
                }
                icon={
                  mom > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : mom < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )
                }
                accent={mom > 0 ? "positive" : mom < 0 ? "negative" : "muted"}
              />
              <SummaryStat
                label="손익분기점 매출"
                primary={
                  monthly.bepSales !== null
                    ? formatKrwCompact(monthly.bepSales)
                    : "계산 불가"
                }
                secondary={
                  monthly.bepSales !== null
                    ? formatKRW(monthly.bepSales)
                    : undefined
                }
                secondaryDetail={
                  monthly.bepSales !== null
                    ? `공헌이익률 ${formatPercent(monthly.contributionMarginRate * 100)}`
                    : "공헌이익률 ≤ 0"
                }
                icon={<Target className="h-4 w-4" />}
              />
            </dl>
          ) : (
            <EmptyState message="선택한 월에 입력된 데이터가 없습니다." />
          )}
        </SectionCard>

        <SectionCard
          title="채널별 매출 비중"
          description="배민 · 요기요 · 쿠팡이츠 · POS"
        >
          {hasData ? (
            <ul className="space-y-3 text-sm">
              {CHANNELS.map((channel) => {
                const sales = monthly.channelSales[channel.id] ?? 0;
                const share = monthly.channelSalesShare[channel.id] ?? 0;
                const sharePct = share * 100;
                /* 상대 너비: 최고 채널 기준 100% */
                const barWidth =
                  maxShare > 0 ? (share / maxShare) * 100 : 0;

                return (
                  <li key={channel.id}>
                    {/* 채널명 + 비중 % */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">
                        {channel.label}
                      </span>
                      <span className="tabular-nums text-xs font-semibold text-muted-foreground">
                        {formatPercent(sharePct)}
                      </span>
                    </div>
                    {/* 진행 바 */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {/* 금액 (compact + full) */}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {formatKrwCompact(sales)}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground font-mono">
                        {formatKRW(sales)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState message="채널별 매출 데이터가 없습니다." />
          )}
        </SectionCard>
      </div>

      {/* ── 월 지표 요약 ── */}
      <SectionCard
        title="월 지표 요약"
        description={`${formatKoreanMonth(month)} · 고정비 ${formatKrwCompact(monthly.totalFixedCost)}`}
      >
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            label="순매출"
            value={formatKrwCompact(monthly.netSales)}
            sub={formatKRW(monthly.netSales)}
          />
          <MiniStat
            label="총변동비"
            value={formatKrwCompact(monthly.totalVariableCost)}
            sub={formatKRW(monthly.totalVariableCost)}
          />
          <MiniStat
            label="공헌이익"
            value={formatKrwCompact(monthly.contributionMargin)}
            sub={formatKRW(monthly.contributionMargin)}
          />
          <MiniStat
            label="기록 일수"
            value={`${monthly.totalDaysWithData}일`}
          />
        </dl>
      </SectionCard>
    </>
  );
}

function formatSignedPercent(value: number): string {
  if (value === 0) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

type StatAccent = "default" | "positive" | "negative" | "muted";

function SummaryStat({
  label,
  primary,
  secondary,
  secondaryDetail,
  icon,
  accent = "default",
}: {
  label: string;
  primary: string;
  secondary?: string;
  secondaryDetail?: string;
  icon?: React.ReactNode;
  accent?: StatAccent;
}) {
  const accentClass = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    muted: "text-muted-foreground",
  }[accent];

  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums tracking-tight",
          accentClass,
        )}
      >
        {primary}
      </p>
      {secondary ? (
        <p className="text-xs text-muted-foreground">{secondary}</p>
      ) : null}
      {secondaryDetail ? (
        <p className="text-xs text-muted-foreground/70 font-mono">{secondaryDetail}</p>
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">
        {value}
      </dd>
      {sub ? (
        <dd className="text-xs tabular-nums text-muted-foreground font-mono">{sub}</dd>
      ) : null}
    </div>
  );
}
