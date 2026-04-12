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
import { CHANNELS } from "@/lib/constants/channels";
import { useAppState } from "@/hooks/useAppState";
import { useComputedMetrics } from "@/hooks/useComputedMetrics";
import { formatKRW, formatPercent } from "@/lib/utils/currency";
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
  const { loading, error } = useAppState();
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

      <section
        aria-label="KPI 카드"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="이번 달 총매출"
          value={formatKRW(monthly.grossSales)}
          hint={
            hasData
              ? `데이터 ${monthly.totalDaysWithData}일 기록됨`
              : loading
                ? "로컬 저장소 로드 중..."
                : "데이터 기준 월: 입력 없음"
          }
          icon={<Wallet />}
        />
        <KpiCard
          label="이번 달 예상 순이익"
          value={formatKRW(monthly.finalNetProfit)}
          hint={
            loading
              ? "데이터 로드 중..."
              : monthly.finalNetProfit >= 0
                ? "고정비 차감 후 흑자"
                : "고정비 차감 후 적자"
          }
          accent={profitAccent}
          icon={
            monthly.finalNetProfit >= 0 ? (
              <TrendingUp />
            ) : (
              <TrendingDown />
            )
          }
        />
        <KpiCard
          label="이번 달 총수수료"
          value={formatKRW(monthly.totalChannelFee)}
          hint="채널 수수료 합계"
          icon={<Receipt />}
        />
        <KpiCard
          label="목표 달성률"
          value={formatPercent(monthly.targetAchievementRate)}
          hint={`목표 ${formatKRW(monthly.targetSales)}`}
          accent={targetAccent}
          icon={<Target />}
        />
      </section>

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
                    ? formatKRW(monthly.bepSales)
                    : "계산 불가"
                }
                secondary={
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
          description="배민 / 요기요 / 쿠팡이츠 / POS"
        >
          {hasData ? (
            <ul className="space-y-2 text-sm">
              {CHANNELS.map((channel) => {
                const sales = monthly.channelSales[channel.id];
                const share = monthly.channelSalesShare[channel.id];
                return (
                  <li
                    key={channel.id}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {channel.label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatPercent(share * 100)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary/70"
                          style={{
                            width: `${Math.min(100, Math.max(0, share * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="min-w-[5.5rem] text-right text-xs font-mono tabular-nums text-foreground">
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

      <SectionCard
        title="월 지표 요약"
        description={`${formatKoreanMonth(month)} · 고정비 ${formatKRW(monthly.totalFixedCost)}`}
      >
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="순매출" value={formatKRW(monthly.netSales)} />
          <MiniStat
            label="총변동비"
            value={formatKRW(monthly.totalVariableCost)}
          />
          <MiniStat
            label="공헌이익"
            value={formatKRW(monthly.contributionMargin)}
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
  icon,
  accent = "default",
}: {
  label: string;
  primary: string;
  secondary?: string;
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
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
