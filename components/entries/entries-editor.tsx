"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { SectionCard } from "@/components/common/section-card";
import { EntriesTableRow } from "./entries-table-row";
import { useAppState } from "@/hooks/useAppState";
import { useStoreAccess } from "@/components/providers/store-access-context";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import { computeDailyMetrics } from "@/lib/calc";
import { getDatesInMonth } from "@/lib/utils/date";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { DailyComputedMetrics, DailyEntry } from "@/types";

export interface EntriesEditorProps {
  month: string;
}

/**
 * 매출 입력 편집기.
 * 선택 월의 모든 날짜에 대해 행을 생성하고, 셀 편집 시 바로 Dexie 에 upsert 한다.
 */
export function EntriesEditor({ month }: EntriesEditorProps) {
  const { entries, settings, loading, error, upsertEntry } = useAppState();
  // StoreAccessContext 가 없으면 (legacy 경로 등) canWrite=true 로 fallback
  let canWrite = true;
  try {
    const access = useStoreAccess();
    canWrite = access.canWrite;
  } catch {
    // legacy 경로에서는 StoreAccessProvider 가 없으므로 무시
  }

  const effectiveSettings = useMemo(
    () => settings ?? buildDefaultSettings(),
    [settings],
  );

  // 해당 월에 저장된 entries 를 date → entry 로 매핑
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DailyEntry>();
    for (const entry of entries) {
      if (entry.month === month) {
        map.set(entry.date, entry);
      }
    }
    return map;
  }, [entries, month]);

  // 월의 모든 날짜 (YYYY-MM-DD)
  const dates = useMemo(() => getDatesInMonth(month), [month]);

  // 저장된 entry 와 병합해 전체 날짜 행 모델 구성
  const rowEntries = useMemo(
    () =>
      dates.map(
        (date) =>
          entriesByDate.get(date) ?? createEmptyEntryFor(date, month),
      ),
    [dates, entriesByDate, month],
  );

  // 모든 행을 한 번만 계산 (행 렌더 + 월 합계에 공통 사용)
  const dailyMetricsList = useMemo(
    () =>
      rowEntries.map((entry) => computeDailyMetrics(entry, effectiveSettings)),
    [rowEntries, effectiveSettings],
  );

  const totals = useMemo(
    () => computeTotals(rowEntries, dailyMetricsList),
    [rowEntries, dailyMetricsList],
  );

  const handleSave = useCallback(
    (next: DailyEntry) => {
      if (!canWrite) return; // 쓰기 차단 상태에서는 no-op
      void upsertEntry(next);
    },
    [upsertEntry, canWrite],
  );

  const footerText = loading
    ? "로컬 저장소 로드 중..."
    : `기록된 날짜 ${entriesByDate.size}일 · 월 총매출 ${formatKRW(totals.grossSales)} · 월 순이익 ${formatKRW(totals.operatingProfit)}`;

  return (
    <SectionCard
      title="일자별 입력표"
      description={
        canWrite
          ? "각 셀을 직접 수정하면 서버에 즉시 저장되고, 대시보드·정산 화면에도 자동 반영됩니다."
          : "현재 계정 상태에서는 읽기만 가능합니다."
      }
      footer={footerText}
    >
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-secondary/60 text-xs font-medium text-muted-foreground">
              <Th sticky>날짜</Th>
              <Th align="right">배민</Th>
              <Th align="right">요기요</Th>
              <Th align="right">쿠팡이츠</Th>
              <Th align="right">POS</Th>
              <Th align="right">환불/취소</Th>
              <Th align="right">광고비</Th>
              <Th align="right">기타변동비</Th>
              <Th align="right" className="border-l border-border bg-accent/40">
                총매출
              </Th>
              <Th align="right" className="bg-accent/40">
                총수수료
              </Th>
              <Th align="right" className="bg-accent/40">
                원가
              </Th>
              <Th align="right" className="bg-accent/40">
                포장비
              </Th>
              <Th align="right" className="bg-accent/40">
                일 순이익
              </Th>
              <Th align="left">메모</Th>
            </tr>
          </thead>

          <tbody>
            {rowEntries.map((entry, index) => (
              <EntriesTableRow
                key={entry.date}
                entry={entry}
                metrics={dailyMetricsList[index]}
                stored={entriesByDate.has(entry.date)}
                onSave={handleSave}
                readOnly={!canWrite}
              />
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-primary/5 text-xs font-semibold text-foreground">
              <TotalTd sticky>월 합계</TotalTd>
              <TotalTd align="right">{formatKRW(totals.baemin)}</TotalTd>
              <TotalTd align="right">{formatKRW(totals.yogiyo)}</TotalTd>
              <TotalTd align="right">{formatKRW(totals.coupang)}</TotalTd>
              <TotalTd align="right">{formatKRW(totals.pos)}</TotalTd>
              <TotalTd align="right">{formatKRW(totals.refundAmount)}</TotalTd>
              <TotalTd align="right">{formatKRW(totals.dailyAdCost)}</TotalTd>
              <TotalTd align="right">
                {formatKRW(totals.extraVariableCost)}
              </TotalTd>
              <TotalTd
                align="right"
                className="border-l border-border bg-primary/10"
              >
                {formatKRW(totals.grossSales)}
              </TotalTd>
              <TotalTd align="right" className="bg-primary/10">
                {formatKRW(totals.totalChannelFee)}
              </TotalTd>
              <TotalTd align="right" className="bg-primary/10">
                {formatKRW(totals.ingredientCost)}
              </TotalTd>
              <TotalTd align="right" className="bg-primary/10">
                {formatKRW(totals.packagingCost)}
              </TotalTd>
              <TotalTd
                align="right"
                className={cn(
                  "bg-primary/10",
                  totals.operatingProfit >= 0
                    ? "text-emerald-600"
                    : "text-destructive",
                )}
              >
                {formatKRW(totals.operatingProfit)}
              </TotalTd>
              <TotalTd align="left" className="text-muted-foreground">
                –
              </TotalTd>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* 헬퍼                                                                */
/* ------------------------------------------------------------------ */

function createEmptyEntryFor(date: string, month: string): DailyEntry {
  return {
    id: date,
    date,
    month,
    sales: { baemin: 0, yogiyo: 0, coupang: 0, pos: 0 },
    refundAmount: 0,
    dailyAdCost: 0,
    extraVariableCost: 0,
    memo: "",
    createdAt: 0,
    updatedAt: 0,
  };
}

interface TotalsData {
  baemin: number;
  yogiyo: number;
  coupang: number;
  pos: number;
  refundAmount: number;
  dailyAdCost: number;
  extraVariableCost: number;
  grossSales: number;
  totalChannelFee: number;
  ingredientCost: number;
  packagingCost: number;
  operatingProfit: number;
}

function computeTotals(
  rows: DailyEntry[],
  metrics: DailyComputedMetrics[],
): TotalsData {
  const acc: TotalsData = {
    baemin: 0,
    yogiyo: 0,
    coupang: 0,
    pos: 0,
    refundAmount: 0,
    dailyAdCost: 0,
    extraVariableCost: 0,
    grossSales: 0,
    totalChannelFee: 0,
    ingredientCost: 0,
    packagingCost: 0,
    operatingProfit: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const entry = rows[i];
    const m = metrics[i];
    acc.baemin += entry.sales.baemin;
    acc.yogiyo += entry.sales.yogiyo;
    acc.coupang += entry.sales.coupang;
    acc.pos += entry.sales.pos;
    acc.refundAmount += entry.refundAmount;
    acc.dailyAdCost += entry.dailyAdCost;
    acc.extraVariableCost += entry.extraVariableCost;
    acc.grossSales += m.grossSales;
    acc.totalChannelFee += m.totalChannelFee;
    acc.ingredientCost += m.ingredientCost;
    acc.packagingCost += m.packagingCost;
    acc.operatingProfit += m.operatingProfitBeforeFixed;
  }

  return acc;
}

/* ------------------------------------------------------------------ */
/* 테이블 셀 래퍼                                                       */
/* ------------------------------------------------------------------ */

function Th({
  children,
  sticky,
  align = "left",
  className,
}: {
  children: ReactNode;
  sticky?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2",
        align === "right" ? "text-right" : "text-left",
        sticky ? "sticky left-0 z-20 bg-secondary/60" : "",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TotalTd({
  children,
  sticky,
  align = "left",
  className,
}: {
  children: ReactNode;
  sticky?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-t border-border px-3 py-2 font-semibold tabular-nums",
        align === "right" ? "text-right" : "text-left",
        sticky ? "sticky left-0 z-10 bg-primary/10" : "",
        className,
      )}
    >
      {children}
    </td>
  );
}
