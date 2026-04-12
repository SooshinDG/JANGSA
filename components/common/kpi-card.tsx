import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type KpiAccent = "default" | "positive" | "negative" | "warning" | "primary";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: KpiAccent;
  icon?: ReactNode;
  className?: string;
}

const ACCENT_CLASS: Record<KpiAccent, string> = {
  default: "text-foreground",
  primary: "text-primary",
  positive: "text-emerald-600",
  negative: "text-destructive",
  warning: "text-amber-600",
};

/**
 * 읽기 전용 지표 카드.
 * 계산 엔진의 결과를 가장 작은 단위로 화면에 표시할 때 사용한다.
 */
export function KpiCard({
  label,
  value,
  hint,
  accent = "default",
  icon,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          ACCENT_CLASS[accent],
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
