"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  if (!MONTH_REGEX.test(month)) return currentMonthKey();
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatKoreanMonth(month: string): string {
  if (!MONTH_REGEX.test(month)) return "";
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

export interface MonthPickerProps {
  value: string;
  onChange: (nextMonth: string) => void;
  label?: string;
  className?: string;
}

/**
 * 월(YYYY-MM) 선택 공통 컴포넌트.
 * - 이전 / 다음 / 이번 달 이동
 * - 네이티브 `input[type=month]` 로 달력에서 직접 선택 가능
 */
export function MonthPicker({
  value,
  onChange,
  label,
  className,
}: MonthPickerProps) {
  const safeValue = MONTH_REGEX.test(value) ? value : currentMonthKey();
  const isCurrent = safeValue === currentMonthKey();

  const buttonBase =
    "flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(shiftMonth(safeValue, -1))}
          className={buttonBase}
          aria-label="이전 달"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-within:ring-2 focus-within:ring-ring/40">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="min-w-[5rem] text-sm font-medium tabular-nums">
            {formatKoreanMonth(safeValue)}
          </span>
          <input
            type="month"
            value={safeValue}
            onChange={(event) => {
              const next = event.target.value;
              if (MONTH_REGEX.test(next)) {
                onChange(next);
              }
            }}
            className="sr-only"
            aria-label="월 선택"
          />
        </label>

        <button
          type="button"
          onClick={() => onChange(shiftMonth(safeValue, 1))}
          className={buttonBase}
          aria-label="다음 달"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onChange(currentMonthKey())}
          disabled={isCurrent}
          className="h-8 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          이번 달
        </button>
      </div>
    </div>
  );
}
