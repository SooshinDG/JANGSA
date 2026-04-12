"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  ChannelKey,
  DailyComputedMetrics,
  DailyEntry,
} from "@/types";
import { formatKRW } from "@/lib/utils/currency";
import {
  getDayOfWeek,
  isTodayDate,
  isWeekendDate,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;

export interface EntriesTableRowProps {
  /** 날짜에 해당하는 effective entry (저장 안 된 날짜면 0으로 초기화된 빈 객체) */
  entry: DailyEntry;
  /** 해당 entry 를 기준으로 계산된 일별 지표 */
  metrics: DailyComputedMetrics;
  /** DB 에 실제로 저장된 날짜인지 (표기만 다르게) */
  stored: boolean;
  /** 저장 요청 콜백 (upsertEntry 로 이어짐) */
  onSave: (next: DailyEntry) => void;
  /** true 면 입력 셀을 disabled 처리 (쓰기 차단 상태) */
  readOnly?: boolean;
}

/**
 * 매출 입력표의 날짜 1행.
 * - 입력 셀: 사용자가 직접 수정
 * - 계산 셀: computeDailyMetrics 결과를 읽기 전용으로 표시
 * - 오늘 / 주말 은 배경으로 강조
 * - readOnly 가 true 면 입력 셀이 disabled 된다
 */
export function EntriesTableRow({
  entry,
  metrics,
  stored,
  onSave,
  readOnly = false,
}: EntriesTableRowProps) {
  const today = isTodayDate(entry.date);
  const weekend = isWeekendDate(entry.date);
  const dow = getDayOfWeek(entry.date);
  const dayNum = Number(entry.date.slice(8, 10));
  const weekdayLabel = dow >= 0 ? WEEKDAY_KR[dow] : "";
  const profit = metrics.operatingProfitBeforeFixed;

  const setChannel = (channel: ChannelKey, value: number) => {
    onSave({
      ...entry,
      sales: { ...entry.sales, [channel]: value },
    });
  };

  const setField = (
    field: "refundAmount" | "dailyAdCost" | "extraVariableCost",
    value: number,
  ) => {
    onSave({ ...entry, [field]: value });
  };

  const setMemo = (value: string) => {
    onSave({ ...entry, memo: value });
  };

  const stickyBgClass = today
    ? "bg-primary/10"
    : weekend
      ? "bg-secondary/40"
      : "bg-card";

  const rowClass = cn(
    "transition-colors",
    today
      ? "bg-primary/10 hover:bg-primary/15"
      : weekend
        ? "bg-secondary/40 hover:bg-secondary/60"
        : "hover:bg-secondary/25",
  );

  return (
    <tr className={rowClass}>
      <td
        className={cn(
          "sticky left-0 z-10 whitespace-nowrap border-t border-border px-3 py-1.5",
          stickyBgClass,
        )}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              today ? "text-primary" : "text-foreground",
            )}
          >
            {dayNum}일
          </span>
          <span
            className={cn(
              "text-xs",
              dow === 0
                ? "text-destructive"
                : dow === 6
                  ? "text-primary"
                  : "text-muted-foreground",
            )}
          >
            {weekdayLabel}
          </span>
          {today ? (
            <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              오늘
            </span>
          ) : null}
          {!stored ? (
            <span
              className="ml-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
              aria-label="미저장"
              title="아직 저장되지 않은 날짜"
            />
          ) : null}
        </div>
      </td>

      <NumberCell value={entry.sales.baemin} onCommit={(v) => setChannel("baemin", v)} disabled={readOnly} />
      <NumberCell value={entry.sales.yogiyo} onCommit={(v) => setChannel("yogiyo", v)} disabled={readOnly} />
      <NumberCell value={entry.sales.coupang} onCommit={(v) => setChannel("coupang", v)} disabled={readOnly} />
      <NumberCell value={entry.sales.pos} onCommit={(v) => setChannel("pos", v)} disabled={readOnly} />

      <NumberCell value={entry.refundAmount} onCommit={(v) => setField("refundAmount", v)} disabled={readOnly} />
      <NumberCell value={entry.dailyAdCost} onCommit={(v) => setField("dailyAdCost", v)} disabled={readOnly} />
      <NumberCell value={entry.extraVariableCost} onCommit={(v) => setField("extraVariableCost", v)} disabled={readOnly} />

      <ComputedCell className="border-l border-border">
        {formatKRW(metrics.grossSales)}
      </ComputedCell>
      <ComputedCell>{formatKRW(metrics.totalChannelFee)}</ComputedCell>
      <ComputedCell>{formatKRW(metrics.ingredientCost)}</ComputedCell>
      <ComputedCell>{formatKRW(metrics.packagingCost)}</ComputedCell>
      <ComputedCell
        className={cn(
          "font-semibold",
          profit > 0
            ? "text-emerald-600"
            : profit < 0
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      >
        {formatKRW(profit)}
      </ComputedCell>

      <MemoCell value={entry.memo ?? ""} onCommit={setMemo} disabled={readOnly} />
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* 내부 셀 컴포넌트                                                    */
/* ------------------------------------------------------------------ */

interface NumberCellProps {
  value: number;
  onCommit: (next: number) => void;
  disabled?: boolean;
}

function NumberCell({ value, onCommit, disabled }: NumberCellProps) {
  const [draft, setDraft] = useState<string>(() =>
    value === 0 ? "" : String(value),
  );

  // 외부에서 entry 가 바뀌면 draft 를 새 값으로 동기화
  useEffect(() => {
    setDraft(value === 0 ? "" : String(value));
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    const parsed = trimmed === "" ? 0 : Number(trimmed);
    const safe =
      Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    if (safe !== value) {
      onCommit(safe);
    } else if (trimmed !== (value === 0 ? "" : String(value))) {
      // 예) "0" / " " 입력 후 blur — 화면 표시는 공란으로 보정
      setDraft(value === 0 ? "" : String(value));
    }
  };

  return (
    <td className="whitespace-nowrap border-t border-border px-1 py-1 text-right">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        value={draft}
        placeholder="0"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "h-8 w-full min-w-[5.75rem] rounded border border-transparent bg-transparent px-2 text-right text-xs tabular-nums text-foreground transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:border-border hover:bg-white focus:border-ring focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/30",
        )}
      />
    </td>
  );
}

interface MemoCellProps {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
}

function MemoCell({ value, onCommit, disabled }: MemoCellProps) {
  const [draft, setDraft] = useState<string>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft !== value) {
      onCommit(draft);
    }
  };

  return (
    <td className="whitespace-nowrap border-t border-border px-1 py-1">
      <input
        type="text"
        value={draft}
        placeholder="-"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "h-8 w-full min-w-[8rem] rounded border border-transparent bg-transparent px-2 text-xs text-foreground transition-colors",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:border-border hover:bg-white focus:border-ring focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/30",
        )}
      />
    </td>
  );
}

function ComputedCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-t border-border bg-accent/10 px-3 py-2 text-right text-xs tabular-nums text-foreground",
        className,
      )}
    >
      {children}
    </td>
  );
}
