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
import { DonutChart, type DonutSegment } from "@/components/dashboard/donut-chart";
import { CHANNELS } from "@/lib/constants/channels";
import { useAppState } from "@/hooks/useAppState";
import { useComputedMetrics } from "@/hooks/useComputedMetrics";
import { formatPercent } from "@/lib/utils/currency";
import { formatKrwCompact } from "@/lib/utils/format-krw-compact";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/* 채널 색상 — 확정 팔레트                                               */
/* baemin #378ADD  yogiyo #D85A30  coupang #1D9E75  pos #7F77DD         */
/* ------------------------------------------------------------------ */
const CHANNEL_COLORS: Record<string, string> = {
  baemin:  "#378ADD",
  yogiyo:  "#D85A30",
  coupang: "#1D9E75",
  pos:     "#7F77DD",
};

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
/* 타입                                                                   */
/* ------------------------------------------------------------------ */

interface Insight {
  text: string;
  tone: "positive" | "caution" | "neutral";
}

interface Alert {
  type: "info" | "warning" | "caution";
  text: string;
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

  /* ── KPI 강조 ── */
  const profitAccent =
    !hasData || loading ? "default"
    : monthly.finalNetProfit >= 0 ? "positive"
    : "negative";
  const targetAccent =
    !hasData || loading ? "default"
    : monthly.targetAchievementRate >= 100 ? "positive"
    : "primary";

  const goalPct = Math.min(100, Math.max(0, monthly.targetAchievementRate));

  /* ── BEP 파생값 ── */
  const bepGap =
    monthly.bepSales !== null ? monthly.grossSales - monthly.bepSales : null;
  const bepAbove = bepGap !== null && bepGap >= 0;

  /* ── 수수료율 ── */
  const feeRate =
    hasData && monthly.grossSales > 0
      ? (monthly.totalChannelFee / monthly.grossSales) * 100
      : 0;

  /* ── 예측 문구 ── */
  const prediction = useMemo((): string | null => {
    if (!hasData || monthly.totalDaysWithData === 0 || monthly.targetSales <= 0)
      return null;

    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (month !== nowKey) return null;
    if (monthly.targetAchievementRate >= 100) return null;

    const dayOfMonth = now.getDate();
    const daysInMonthTotal = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remaining = daysInMonthTotal - dayOfMonth;
    if (remaining <= 0) return null;

    const dailyAvg = monthly.grossSales / monthly.totalDaysWithData;
    const projected = monthly.grossSales + dailyAvg * remaining;

    if (projected >= monthly.targetSales) {
      const daysToGoal = Math.max(
        1,
        Math.ceil((monthly.targetSales - monthly.grossSales) / dailyAvg),
      );
      const goalDate = new Date(now);
      goalDate.setDate(now.getDate() + daysToGoal);
      return `${goalDate.getMonth() + 1}월 ${goalDate.getDate()}일경 목표 달성 예상`;
    }
    return null;
  }, [hasData, monthly, month]);

  /* ── 도넛 세그먼트 ── */
  const donutSegments: DonutSegment[] = useMemo(
    () =>
      CHANNELS.map((ch) => ({
        id: ch.id,
        label: ch.label,
        value: monthly.channelSales[ch.id] ?? 0,
        color: CHANNEL_COLORS[ch.id] ?? "#94a3b8",
      })),
    [monthly.channelSales],
  );

  /* ── 이달 인사이트 ── */
  const insights = useMemo((): Insight[] => {
    if (!hasData) return [];
    const list: Insight[] = [];

    if (mom !== 0) {
      list.push({
        text: mom > 0
          ? `전월 대비 ${mom.toFixed(1)}% 더 팔았습니다.`
          : `전월 대비 ${Math.abs(mom).toFixed(1)}% 감소했습니다.`,
        tone: mom > 0 ? "positive" : "caution",
      });
    }

    const topCh = CHANNELS.reduce(
      (best, ch) =>
        (monthly.channelSalesShare[ch.id] ?? 0) >
        (monthly.channelSalesShare[best.id] ?? 0) ? ch : best,
      CHANNELS[0],
    );
    const topShare = (monthly.channelSalesShare[topCh.id] ?? 0) * 100;
    if (topShare > 0) {
      list.push({
        text: `1위 채널은 ${topCh.label} (${formatPercent(topShare)})입니다.`,
        tone: "neutral",
      });
    }

    if (monthly.bepSales !== null) {
      const gap = monthly.grossSales - monthly.bepSales;
      list.push(
        gap >= 0
          ? { text: `손익분기점 대비 ${formatKrwCompact(gap)} 여유가 있습니다.`, tone: "positive" }
          : { text: `손익분기점까지 ${formatKrwCompact(-gap)} 부족합니다.`, tone: "caution" },
      );
    }

    if (monthly.targetSales > 0) {
      if (monthly.targetAchievementRate >= 100) {
        list.push({ text: "이번 달 목표 매출을 달성했습니다!", tone: "positive" });
      } else {
        const remaining = monthly.targetSales - monthly.grossSales;
        if (remaining > 0)
          list.push({ text: `목표까지 ${formatKrwCompact(remaining)} 남았습니다.`, tone: "neutral" });
      }
    }

    if (monthly.totalDaysWithData > 0) {
      const avg = monthly.grossSales / monthly.totalDaysWithData;
      list.push({ text: `평균 일매출 ${formatKrwCompact(avg)}입니다.`, tone: "neutral" });
    }

    return list.slice(0, 4);
  }, [hasData, monthly, mom]);

  /* ── 경보·알림 ── */
  const alerts = useMemo((): Alert[] => {
    if (!hasData) return [];
    const list: Alert[] = [];

    /* 1. 채널 편중 */
    const topShare = Math.max(
      ...CHANNELS.map((c) => (monthly.channelSalesShare[c.id] ?? 0) * 100),
    );
    const topChForAlert = CHANNELS.find(
      (c) => (monthly.channelSalesShare[c.id] ?? 0) * 100 >= topShare - 0.01,
    );
    if (topChForAlert && topShare > 0) {
      list.push(
        topShare > 50
          ? {
              type: "warning",
              text: `${topChForAlert.label} 비중 ${topShare.toFixed(0)}% — 채널 분산을 권장합니다.`,
            }
          : {
              type: "info",
              text: `${topChForAlert.label} 비중 ${topShare.toFixed(0)}% — 채널 구성 안정적입니다.`,
            },
      );
    }

    /* 2. 수수료율 */
    const alertFeeRate =
      monthly.grossSales > 0
        ? (monthly.totalChannelFee / monthly.grossSales) * 100
        : 0;
    if (alertFeeRate > 0) {
      const isHigh = alertFeeRate > 9;
      list.push({
        type: isHigh ? "warning" : "info",
        text: `수수료율 ${alertFeeRate.toFixed(1)}% — ${isHigh ? "업종 평균보다 높습니다." : "업종 평균 수준입니다."}`,
      });
    }

    /* 3. 손익분기점 달성 여부 */
    if (monthly.bepSales !== null) {
      list.push(
        bepAbove
          ? { type: "info", text: "손익분기점은 이미 달성했습니다." }
          : {
              type: "caution",
              text: `손익분기점까지 ${formatKrwCompact(monthly.bepSales - monthly.grossSales)} 부족합니다.`,
            },
      );
    }

    /* 4. 목표 달성 예측 */
    if (prediction) {
      list.push({ type: "info", text: `현재 속도라면 ${prediction}입니다.` });
    } else if (monthly.targetSales > 0 && monthly.targetAchievementRate < 100) {
      const remaining = monthly.targetSales - monthly.grossSales;
      if (remaining > 0) {
        list.push({ type: "info", text: `목표까지 ${formatKrwCompact(remaining)} 남았습니다.` });
      }
    } else if (monthly.targetAchievementRate >= 100) {
      list.push({ type: "info", text: "이번 달 목표 매출을 달성했습니다!" });
    }

    return list.slice(0, 4);
  }, [hasData, monthly, prediction, bepAbove]);

  /* ── 차트 통계 ── */
  const avgDailySales =
    monthly.totalDaysWithData > 0
      ? monthly.grossSales / monthly.totalDaysWithData
      : 0;

  return (
    <>
      {/* ── 헤더 ── */}
      <PageHeader
        title="대시보드"
        description={`${formatKoreanMonth(month)} 기준${hasData ? ` · ${monthly.totalDaysWithData}일까지` : ""}`}
        actions={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
            {hasData && (monthly.bestSalesDate || avgDailySales > 0) && (
              <span className="hidden text-xs text-muted-foreground md:block">
                {monthly.bestSalesDate && (
                  <>
                    최고 매출일:{" "}
                    <strong className="font-semibold text-foreground">
                      {formatShortDate(monthly.bestSalesDate)}
                    </strong>
                  </>
                )}
                {monthly.bestSalesDate && avgDailySales > 0 && " · "}
                {avgDailySales > 0 && (
                  <>
                    평균 일매출{" "}
                    <strong className="font-semibold text-foreground">
                      {formatKrwCompact(avgDailySales)}
                    </strong>
                  </>
                )}
              </span>
            )}
            <MonthPicker value={month} onChange={setMonth} />
          </div>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* ── 행 1: KPI 4개 ── */}
      <section aria-label="핵심 지표" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="이번 달 총매출"
          value={formatKrwCompact(monthly.grossSales)}
          hint={
            hasData && mom !== 0 ? (
              <span className={cn("font-medium", mom > 0 ? "text-emerald-600" : "text-destructive")}>
                {mom > 0 ? "▲" : "▼"} 전월 대비 {formatSignedPercent(mom)}
              </span>
            ) : loading ? "로드 중..." : hasData ? undefined : "데이터 없음"
          }
          icon={<Wallet />}
        />
        <KpiCard
          label="예상 순이익"
          value={formatKrwCompact(monthly.finalNetProfit)}
          hint={
            hasData ? (
              <span>
                {monthly.finalNetProfit >= 0 ? "흑자" : "적자"}
                {monthly.contributionMarginRate > 0
                  ? ` · 공헌이익률 ${formatPercent(monthly.contributionMarginRate * 100)}`
                  : ""}
              </span>
            ) : loading ? "로드 중..." : "데이터 없음"
          }
          accent={profitAccent}
          icon={monthly.finalNetProfit >= 0 ? <TrendingUp /> : <TrendingDown />}
        />
        <KpiCard
          label="중수수료"
          value={formatKrwCompact(monthly.totalChannelFee)}
          hint={
            hasData && monthly.grossSales > 0 ? (
              <span>매출 대비 {formatPercent(feeRate)}</span>
            ) : loading ? "로드 중..." : "데이터 없음"
          }
          icon={<Receipt />}
        />
        <KpiCard
          label="목표 달성률"
          value={formatPercent(monthly.targetAchievementRate)}
          hint={
            monthly.targetSales > 0 ? (
              <span>
                잔여 {formatKrwCompact(Math.max(0, monthly.targetSales - monthly.grossSales))}{" "}
                · 목표 {formatKrwCompact(monthly.targetSales)}
              </span>
            ) : "목표를 설정해 주세요"
          }
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
                  "h-full rounded-full transition-all duration-700",
                  monthly.targetAchievementRate >= 100 ? "bg-emerald-500" : "bg-primary",
                )}
                style={{ width: `${goalPct}%` }}
              />
            </div>
          }
        />
      </section>

      {/* ── 행 2: 일별 차트 + 채널 도넛 ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* 일별 매출 추이 */}
        <SectionCard
          title="일별 매출 추이"
          description={`${formatKoreanMonth(month)} · 일별 총매출 기준`}
          className="lg:col-span-2"
          footer={
            hasData ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  평균 일매출{" "}
                  <strong className="text-foreground tabular-nums">
                    {formatKrwCompact(avgDailySales)}
                  </strong>
                </span>
                {monthly.bestSalesDate && (
                  <span className="text-muted-foreground">
                    최고 매출{" "}
                    <strong className="text-foreground">
                      {formatShortDate(monthly.bestSalesDate)}
                    </strong>
                    {" "}
                    <span className="tabular-nums">
                      {formatKrwCompact(monthly.bestSalesAmount)}
                    </span>
                  </span>
                )}
                <span className="text-muted-foreground">
                  기록{" "}
                  <strong className="text-foreground">
                    {monthly.totalDaysWithData}일
                  </strong>
                </span>
              </div>
            ) : undefined
          }
        >
          {hasData ? (
            <DailySalesChart entries={entries} month={month} />
          ) : (
            <EmptyState message="매출을 입력하면 일별 추이를 확인할 수 있습니다." />
          )}
        </SectionCard>

        {/* 채널별 매출 비중 — 도넛 + 우측 레전드 */}
        <SectionCard title="채널별 매출 비중" description="비중 % 기준">
          {hasData ? (
            <div className="flex items-center gap-4">
              {/* 도넛 차트 */}
              <div className="shrink-0">
                <DonutChart
                  segments={donutSegments}
                  size={116}
                  thickness={19}
                  centerLabel={formatKrwCompact(monthly.grossSales)}
                  centerSubLabel="총매출"
                />
              </div>
              {/* 채널 비율 리스트 */}
              <ul className="flex-1 min-w-0 space-y-3">
                {CHANNELS.map((ch) => {
                  const share = monthly.channelSalesShare[ch.id] ?? 0;
                  const sharePct = share * 100;
                  const color = CHANNEL_COLORS[ch.id] ?? "#94a3b8";
                  return (
                    <li key={ch.id} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 min-w-0 text-xs text-foreground truncate">
                        {ch.shortLabel ?? ch.label}
                      </span>
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-secondary shrink-0">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, sharePct)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums font-semibold text-foreground">
                        {formatPercent(sharePct)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <EmptyState message="채널별 매출 데이터가 없습니다." />
          )}
        </SectionCard>
      </div>

      {/* ── 행 3: 손익 현황 + 인사이트 + 알림 ── */}
      <div className="grid gap-3 lg:grid-cols-3">

        {/* 손익 / BEP 현황 */}
        <SectionCard title="손익 현황" description="손익분기점 달성 여부">
          {hasData ? (
            <div className="space-y-3">
              {/* BEP 상태 박스 */}
              {bepGap !== null ? (
                <div
                  className={cn(
                    "rounded-xl p-4",
                    bepAbove
                      ? "border border-green-100 bg-green-50"
                      : "border border-amber-100 bg-amber-50/60",
                  )}
                >
                  <p className={cn(
                    "text-xs font-medium",
                    bepAbove ? "text-green-600" : "text-amber-600",
                  )}>
                    {bepAbove ? "손익분기점 대비 여유" : "손익분기점까지 부족"}
                  </p>
                  <p className={cn(
                    "text-2xl font-bold tabular-nums mt-0.5",
                    bepAbove ? "text-green-700" : "text-amber-600",
                  )}>
                    {bepGap >= 0 ? "+" : ""}{formatKrwCompact(bepGap)}
                  </p>
                  {monthly.bepSales !== null && (
                    <p className={cn(
                      "text-xs mt-1.5",
                      bepAbove ? "text-green-600/80" : "text-amber-600/80",
                    )}>
                      손익분기 매출 {formatKrwCompact(monthly.bepSales)}{" "}
                      {bepAbove ? "이미 달성" : "미달성"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-lg bg-secondary px-3 py-3 text-xs text-muted-foreground">
                  설정에서 원가율을 입력하면 손익분기점을 계산합니다.
                </p>
              )}

              {/* 목표 달성 예측 */}
              {prediction && (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-3.5 py-3">
                  <p className="text-[11px] text-muted-foreground">이 속도라면 이번 달 목표</p>
                  <p className="mt-0.5 text-sm font-semibold text-primary">{prediction}</p>
                </div>
              )}

              {/* 미니 통계 그리드 */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Trophy className="h-3 w-3" />
                    <span>최고 매출일</span>
                  </div>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {monthly.bestSalesDate ? formatShortDate(monthly.bestSalesDate) : "—"}
                  </p>
                  {monthly.bestSalesDate && (
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      {formatKrwCompact(monthly.bestSalesAmount)}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    {mom > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : mom < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    <span>전월 대비</span>
                  </div>
                  <p className={cn(
                    "mt-1 text-sm font-bold tabular-nums",
                    mom > 0 ? "text-emerald-600" : mom < 0 ? "text-destructive" : "text-foreground",
                  )}>
                    {formatSignedPercent(mom)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {mom === 0 ? "전월 데이터 없음" : mom > 0 ? "성장 중" : "감소 중"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="매출 데이터를 입력하면 손익 현황을 확인할 수 있습니다." />
          )}
        </SectionCard>

        {/* 이달 인사이트 */}
        <SectionCard title="이달 인사이트" description="운영 핵심 요약">
          {insights.length > 0 ? (
            <ul className="space-y-3">
              {insights.map((ins, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 text-sm leading-snug",
                    ins.tone === "positive" && "text-green-800",
                    ins.tone === "caution" && "text-amber-700",
                    ins.tone === "neutral" && "text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                      ins.tone === "positive" && "bg-green-500",
                      ins.tone === "caution" && "bg-amber-500",
                      ins.tone === "neutral" && "bg-muted-foreground/40",
                    )}
                    aria-hidden="true"
                  />
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="매출 데이터를 입력하면 인사이트를 확인할 수 있습니다." />
          )}

          {prediction && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2.5">
              <p className="text-xs font-medium text-primary">
                현재 속도라면 {prediction}
              </p>
            </div>
          )}
        </SectionCard>

        {/* 경보·알림 */}
        <SectionCard title="경보·알림" description="채널·수수료·수익 점검">
          {alerts.length > 0 ? (
            <ul className="space-y-3">
              {alerts.map((alert, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs leading-snug"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      alert.type === "warning" && "bg-amber-400",
                      alert.type === "caution" && "bg-red-400",
                      alert.type === "info" && "bg-blue-400",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "leading-relaxed",
                      alert.type === "warning" && "text-amber-700",
                      alert.type === "caution" && "text-red-700",
                      alert.type === "info" && "text-foreground",
                    )}
                  >
                    {alert.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="매출 데이터를 입력하면 운영 알림을 확인할 수 있습니다." />
          )}
        </SectionCard>
      </div>
    </>
  );
}
