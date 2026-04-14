import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type KpiAccent = "default" | "positive" | "negative" | "warning" | "primary";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** 카드 하단에 추가로 렌더링할 콘텐츠 (예: 진행 바) */
  footer?: ReactNode;
  accent?: KpiAccent;
  icon?: ReactNode;
  className?: string;
}

const ACCENT_VALUE_CLASS: Record<KpiAccent, string> = {
  default: "text-foreground",
  primary: "text-primary",
  positive: "text-emerald-600",
  negative: "text-destructive",
  warning: "text-amber-600",
};

/**
 * 읽기 전용 지표 카드.
 * `className` 으로 테두리 강조 색상 등을 추가할 수 있다.
 *   예: className="border-t-[3px] border-t-primary"
 */
export function KpiCard({
  label,
  value,
  hint,
  footer,
  accent = "default",
  icon,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-5 py-4",
        "shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground leading-tight">
          {label}
        </span>
        {icon ? (
          <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4 shrink-0">
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2.5 text-2xl font-bold tracking-tight tabular-nums",
          ACCENT_VALUE_CLASS[accent],
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground leading-snug">{hint}</p>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
