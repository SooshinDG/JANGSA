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

/* ------------------------------------------------------------------ */
/* 헬퍼                                                                  */
/* ------------------------------------------------------------------ */

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

function formatSignedPercent(value: number): string {
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/* 인사이트 타입                                                         */
/* ------------------------------------------------------------------ */

interface Insight {
  text: string;
  tone: "positive" | "caution" | "neutral";
}

/* ------------------------------------------------------------------ */
/* 페이지                                                                */
/* ------------------------------------------------------------------ */

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

  /* KPI accent */
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
    monthly.targetAchievementRate >= 100 ? "bg-emerald-500" : "bg-primary";

  /* ── 운영 인사이트 계산 ── */
  const insights = useMemo((): Insight[] => {
    if (!hasData) return [];

    const list: Insight[] = [];

    // 1. 전월 대비 추세
    if (mom !== 0) {
      list.push({
        text:
          mom > 0
            ? `전월 대비 ${mom.toFixed(1)}% 더 팔았습니다.`
            : `전월 대비 ${Math.abs(mom).toFixed(1)}% 감소했습니다.`,
        tone: mom > 0 ? "positive" : "caution",
      });
    }

    // 2. 매출 1위 채널
    const topCh = CHANNELS.reduce(
      (best, ch) =>
        (monthly.channelSalesShare[ch.id] ?? 0) >
        (monthly.channelSalesShare[best.id] ?? 0)
          ? ch
          : best,
      CHANNELS[0],
    );
    const topShare = (monthly.channelSalesShare[topCh.id] ?? 0) * 100;
    if (topShare > 0) {
      list.push({
        text: `매출 1위 채널은 ${topCh.label} (${formatPercent(topShare)})입니다.`,
        tone: "neutral",
      });
    }

    // 3. 손익분기점 대비
    if (monthly.bepSales !== null) {
      const gap = monthly.grossSales - monthly.bepSales;
      list.push(
        gap >= 0
          ? {
              text: `손익분기점 대비 ${formatKrwCompact(gap)} 여유가 있습니다.`,
              tone: "positive",
            }
          : {
              text: `손익분기점까지 ${formatKrwCompact(-gap)} 부족합니다.`,
              tone: "caution",
            },
      );
    }

    // 4. 목표 달성 상태
    if (monthly.targetSales > 0) {
      if (monthly.targetAchievementRate >= 100) {
        list.push({
          text: "이번 달 목표 매출을 달성했습니다!",
          tone: "positive",
        });
      } else {
        const remaining = monthly.targetSales - monthly.grossSales;
        if (remaining > 0) {
          list.push({
            text: `목표까지 ${formatKrwCompact(remaining)} 남았습니다.`,
            tone: "neutral",
          });
        }
      }
    }

    // 5. 평균 일매출
    if (monthly.totalDaysWithData > 0) {
      const avg = monthly.grossSales / monthly.totalDaysWithData;
      list.push({
        text: `평균 일매출은 ${formatKrwCompact(avg)}입니다.`,
        tone: "neutral",
      });
    }

    return list.slice(0, 5);
  }, [hasData, monthly, mom]);

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

      {/* ── KPI 카드 4개 ── */}
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
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  goalBarColor,
                )}
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

      {/* ── 월 요약 + 채널 비중 ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 왼쪽: 월 요약 (통계 3개 + 인사이트) */}
        <SectionCard
          title="월 요약"
          description="최고 매출일 · 전월 대비 · 손익분기점"
          className="lg:col-span-2"
        >
          {hasData ? (
            <>
              {/* 3개 요약 카드 */}
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
                      ? `공헌이익률 ${formatPercent(monthly.contributionMarginRate * 100)}`
                      : "공헌이익률 ≤ 0"
                  }
                  icon={<Target className="h-4 w-4" />}
                />
              </dl>

              {/* 운영 인사이트 */}
              {insights.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    이달 인사이트
                  </p>
                  <ul className="space-y-2">
                    {insights.map((ins, i) => (
                      <li
                        key={i}
                        className={cn(
                          "flex items-start gap-2 text-sm leading-snug",
                          ins.tone === "positive" && "text-emerald-600",
                          ins.tone === "caution" && "text-amber-600",
                          ins.tone === "neutral" && "text-foreground",
                        )}
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        <span>{ins.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="선택한 월에 입력된 데이터가 없습니다." />
          )}
        </SectionCard>

        {/* 오른쪽: 채널별 매출 비중 */}
        <SectionCard
          title="채널별 매출 비중"
          description="비중 기준 · 금액은 보조"
        >
          {hasData ? (
            <ul className="space-y-4 text-sm">
              {CHANNELS.map((channel) => {
                const sales = monthly.channelSales[channel.id] ?? 0;
                const share = monthly.channelSalesShare[channel.id] ?? 0;
                const sharePct = share * 100;

                return (
                  <li key={channel.id}>
                    {/* 채널명 / 비중 % */}
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {channel.label}
                      </span>
                      <span className="tabular-nums text-sm font-semibold text-foreground">
                        {formatPercent(sharePct)}
                      </span>
                    </div>
                    {/* 비중 바 — width = 실제 비중 % */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${Math.min(100, sharePct)}%` }}
                      />
                    </div>
                    {/* 금액 보조 */}
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {formatKrwCompact(sales)}
                      <span className="ml-1 font-mono opacity-70">
                        ({formatKRW(sales)})
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState message="채널별 매출 데이터가 없습니다." />
          )}
        </SectionCard>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 서브 컴포넌트                                                         */
/* ------------------------------------------------------------------ */

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
  const accentClass: Record<StatAccent, string> = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums tracking-tight",
          accentClass[accent],
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
