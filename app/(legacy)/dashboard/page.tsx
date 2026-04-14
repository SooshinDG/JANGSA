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
  AlertCircle,
  CheckCircle2,
  Info,
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
import { formatKRW, formatPercent } from "@/lib/utils/currency";
import { formatKrwCompact } from "@/lib/utils/format-krw-compact";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/* 채널 색상 — 확정 팔레트                                               */
/* baemin #378ADD  yogiyo #D85A30  coupang #1D9E75  pos #7F77DD         */
/* ------------------------------------------------------------------ */
const CHANNEL_COLORS: Record<string, string> = {
  baemin:  "#378ADD",   // Blue 400
  yogiyo:  "#D85A30",   // Coral 400
  coupang: "#1D9E75",   // Teal 400
  pos:     "#7F77DD",   // Purple 400
};

/* ------------------------------------------------------------------ */
/* BEP 달성 박스 색상 — 기준표 고정값                                    */
/* ------------------------------------------------------------------ */
const BEP_ABOVE_BG       = "#EAF3DE";   // Green 50
const BEP_ABOVE_BORDER   = "#B8DDA0";   // Green 200
const BEP_ABOVE_TITLE    = "#27500A";   // Green 800
const BEP_ABOVE_AMOUNT   = "#3B6D11";   // Green 600

/* ------------------------------------------------------------------ */
/* 인사이트 긍정 색상 — 기준표 고정값                                    */
/* ------------------------------------------------------------------ */
const INSIGHT_POS_DOT  = "#639922";   // Green 400 (bullet)
const INSIGHT_POS_TEXT = "#27500A";   // Green 800 (문장)

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

  /* ── BEP 파생값 (알림보다 먼저 계산) ── */
  const bepGap =
    monthly.bepSales !== null ? monthly.grossSales - monthly.bepSales : null;
  const bepAbove = bepGap !== null && bepGap >= 0;

  /* ── 예측 문구 (알림보다 먼저 계산) ── */
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
      return `현재 속도라면 ${goalDate.getMonth() + 1}월 ${goalDate.getDate()}일경 목표 달성 예상`;
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
          ? `전월 매출 대비 ${mom.toFixed(1)}% 더 팔았습니다.`
          : `전월 매출 대비 ${Math.abs(mom).toFixed(1)}% 감소했습니다.`,
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
        text: `매출 1위 채널은 ${topCh.label} (${formatPercent(topShare)})입니다.`,
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

    return list.slice(0, 5);
  }, [hasData, monthly, mom]);

  /* ── 운영 알림 — 5~6개로 확장 ── */
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
    const feeRate =
      monthly.grossSales > 0
        ? (monthly.totalChannelFee / monthly.grossSales) * 100
        : 0;
    if (feeRate > 0) {
      const isHigh = feeRate > 9;
      list.push({
        type: isHigh ? "warning" : "info",
        text: `평균 수수료율 ${feeRate.toFixed(1)}% — ${isHigh ? "업종 평균보다 높습니다." : "업종 평균 수준입니다."}`,
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

    /* 4. 목표 달성 예측 (현재 달에만) */
    if (prediction) {
      list.push({ type: "info", text: `${prediction}입니다.` });
    } else if (monthly.targetSales > 0 && monthly.targetAchievementRate < 100) {
      const remaining = monthly.targetSales - monthly.grossSales;
      if (remaining > 0) {
        list.push({ type: "info", text: `목표까지 ${formatKrwCompact(remaining)} 남았습니다.` });
      }
    } else if (monthly.targetAchievementRate >= 100) {
      list.push({ type: "info", text: "이번 달 목표 매출을 달성했습니다!" });
    }

    /* 5. 흑자/적자 상태 */
    list.push(
      monthly.finalNetProfit >= 0
        ? {
            type: "info",
            text: `이번 달 흑자 운영 중입니다. (순이익 ${formatKrwCompact(monthly.finalNetProfit)})`,
          }
        : {
            type: "caution",
            text: "고정비 차감 후 적자입니다. 비용 점검을 권장합니다.",
          },
    );

    /* 6. 최고 매출일 코멘트 */
    if (monthly.bestSalesDate) {
      list.push({
        type: "info",
        text: `최고 매출일은 ${formatShortDate(monthly.bestSalesDate)} (${formatKrwCompact(monthly.bestSalesAmount)})입니다.`,
      });
    }

    return list.slice(0, 6);
  }, [hasData, monthly, prediction, bepAbove]);

  /* ── 차트 카드 하단 통계 ── */
  const avgDailySales =
    monthly.totalDaysWithData > 0
      ? monthly.grossSales / monthly.totalDaysWithData
      : 0;

  return (
    <>
      {/* ── 헤더 ── */}
      <PageHeader
        title="대시보드"
        description={`${formatKoreanMonth(month)} 기준 주요 지표`}
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* ── 행 1: KPI 4개 ── */}
      <section aria-label="핵심 지표" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="이번 달 총매출"
          value={formatKrwCompact(monthly.grossSales)}
          hint={
            hasData ? (
              <span className="font-mono">{formatKRW(monthly.grossSales)}</span>
            ) : loading ? "로드 중..." : "데이터 없음"
          }
          icon={<Wallet />}
          className="border-t-[3px] border-t-primary"
        />
        <KpiCard
          label="예상 순이익"
          value={formatKrwCompact(monthly.finalNetProfit)}
          hint={
            <span>
              <span className="font-mono">{formatKRW(monthly.finalNetProfit)}</span>
              {" · "}{monthly.finalNetProfit >= 0 ? "흑자" : "적자"}
            </span>
          }
          accent={profitAccent}
          icon={monthly.finalNetProfit >= 0 ? <TrendingUp /> : <TrendingDown />}
          className={cn(
            "border-t-[3px]",
            !hasData ? "border-t-border"
            : monthly.finalNetProfit >= 0 ? "border-t-emerald-500"
            : "border-t-destructive",
          )}
        />
        <KpiCard
          label="이번 달 수수료"
          value={formatKrwCompact(monthly.totalChannelFee)}
          hint={<span className="font-mono">{formatKRW(monthly.totalChannelFee)}</span>}
          icon={<Receipt />}
          className="border-t-[3px] border-t-amber-400"
        />
        <KpiCard
          label="목표 달성률"
          value={formatPercent(monthly.targetAchievementRate)}
          hint={
            <span>
              목표 {formatKrwCompact(monthly.targetSales)}
              {prediction ? (
                <span className="block mt-0.5 text-primary font-medium">{prediction}</span>
              ) : null}
            </span>
          }
          accent={targetAccent}
          icon={<Target />}
          className={cn(
            "border-t-[3px]",
            !hasData ? "border-t-border"
            : monthly.targetAchievementRate >= 100 ? "border-t-emerald-500"
            : "border-t-primary",
          )}
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
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 일별 매출 추이 — footer 통계로 하단 공간 활용 */}
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

        {/* 채널별 매출 비중 — 상세 금액 리스트 제거, 도넛+비율만 */}
        <SectionCard title="채널별 매출 비중" description="비중 % 기준">
          {hasData ? (
            <div className="flex flex-col items-center gap-5">
              {/* 도넛 차트 */}
              <DonutChart
                segments={donutSegments}
                size={148}
                thickness={23}
                centerLabel={formatKrwCompact(monthly.grossSales)}
                centerSubLabel="총매출"
              />
              {/* 채널 비율 리스트 — % 와 색상 바만 */}
              <ul className="w-full space-y-2.5 text-sm">
                {CHANNELS.map((ch) => {
                  const share = monthly.channelSalesShare[ch.id] ?? 0;
                  const sharePct = share * 100;
                  const color = CHANNEL_COLORS[ch.id] ?? "#94a3b8";
                  return (
                    <li key={ch.id} className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">
                        {ch.shortLabel}
                      </span>
                      {/* 비율 바 */}
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary shrink-0">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, sharePct)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums font-semibold text-foreground">
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
      <div className="grid gap-4 lg:grid-cols-3">

        {/* 손익 / BEP 현황 */}
        <SectionCard title="손익 현황" description="손익분기점 달성 여부">
          {hasData ? (
            <div className="space-y-3">
              {/* BEP 상태 — 기준표 색상 적용 */}
              {bepGap !== null ? (
                <div
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
                    !bepAbove && "border-amber-200 bg-amber-50",
                  )}
                  style={
                    bepAbove
                      ? { backgroundColor: BEP_ABOVE_BG, borderColor: BEP_ABOVE_BORDER }
                      : undefined
                  }
                >
                  {bepAbove ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: BEP_ABOVE_AMOUNT }}
                    />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p
                      className="font-semibold"
                      style={bepAbove ? { color: BEP_ABOVE_TITLE } : undefined}
                    >
                      <span className={!bepAbove ? "text-amber-700" : ""}>
                        {bepAbove ? "손익분기점 달성" : "손익분기점 미달"}
                      </span>
                    </p>
                    <p
                      className={cn(
                        "text-xl font-bold tabular-nums mt-0.5",
                        !bepAbove && "text-amber-600",
                      )}
                      style={bepAbove ? { color: BEP_ABOVE_AMOUNT } : undefined}
                    >
                      {bepGap >= 0 ? "+" : ""}
                      {formatKrwCompact(bepGap)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  설정에서 원가율을 입력하면 손익분기점을 계산합니다.
                </p>
              )}

              {/* 최고 매출일 + 전월 대비 */}
              <div className="grid grid-cols-2 gap-2">
                <MiniStatCard
                  label="최고 매출일"
                  value={monthly.bestSalesDate ? formatShortDate(monthly.bestSalesDate) : "—"}
                  sub={monthly.bestSalesDate ? formatKrwCompact(monthly.bestSalesAmount) : undefined}
                  icon={<Trophy className="h-3 w-3" />}
                />
                <MiniStatCard
                  label="전월 매출 대비"
                  value={formatSignedPercent(mom)}
                  sub={
                    mom === 0 ? "전월 데이터 없음"
                    : mom > 0 ? "성장 중"
                    : "감소 중"
                  }
                  accent={mom > 0 ? "positive" : mom < 0 ? "negative" : "muted"}
                  icon={
                    mom > 0 ? <TrendingUp className="h-3 w-3" />
                    : mom < 0 ? <TrendingDown className="h-3 w-3" />
                    : <Minus className="h-3 w-3" />
                  }
                />
              </div>

              {/* BEP 상세 수치 */}
              {monthly.bepSales !== null && (
                <div className="space-y-1 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">손익분기 매출</span>
                    <span className="font-medium tabular-nums">{formatKrwCompact(monthly.bepSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">공헌이익률</span>
                    <span className="font-medium">{formatPercent(monthly.contributionMarginRate * 100)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">이번 달 기록</span>
                    <span className="font-medium">{monthly.totalDaysWithData}일</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState message="매출 데이터를 입력하면 손익 현황을 확인할 수 있습니다." />
          )}
        </SectionCard>

        {/* 이달 인사이트 */}
        <SectionCard title="이달 인사이트" description="운영 핵심 요약">
          {insights.length > 0 ? (
            <ul className="space-y-2.5">
              {insights.map((ins, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 text-sm leading-snug",
                    ins.tone === "caution" && "text-amber-700",
                    ins.tone === "neutral" && "text-foreground",
                  )}
                  style={ins.tone === "positive" ? { color: INSIGHT_POS_TEXT } : undefined}
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        ins.tone === "positive" ? INSIGHT_POS_DOT
                        : ins.tone === "caution" ? "#d97706"   // amber-600
                        : "hsl(var(--muted-foreground))",
                    }}
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
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
              <p className="text-xs font-medium text-primary">{prediction}</p>
            </div>
          )}
        </SectionCard>

        {/* 운영 알림 — 5~6개로 확장 */}
        <SectionCard title="운영 알림" description="채널·수수료·수익 점검">
          {alerts.length > 0 ? (
            <ul className="space-y-1.5">
              {alerts.map((alert, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-snug",
                    alert.type === "info" &&
                      "border-blue-100 bg-blue-50 text-blue-800",
                    alert.type === "warning" &&
                      "border-amber-200 bg-amber-50 text-amber-800",
                    alert.type === "caution" &&
                      "border-red-100 bg-red-50 text-red-800",
                  )}
                >
                  {alert.type === "info" && (
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  )}
                  {(alert.type === "warning" || alert.type === "caution") && (
                    <AlertCircle
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        alert.type === "warning" ? "text-amber-500" : "text-red-500",
                      )}
                    />
                  )}
                  <span className="font-medium">{alert.text}</span>
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

/* ------------------------------------------------------------------ */
/* 서브 컴포넌트                                                         */
/* ------------------------------------------------------------------ */

type MiniAccent = "default" | "positive" | "negative" | "muted";

function MiniStatCard({
  label,
  value,
  sub,
  icon,
  accent = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: MiniAccent;
}) {
  const accentClass: Record<MiniAccent, string> = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn("mt-1 text-base font-bold tabular-nums tracking-tight", accentClass[accent])}>
        {value}
      </p>
      {sub ? (
        <p className="text-[10px] leading-tight text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}
