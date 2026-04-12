import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * 데이터가 없을 때 보여주는 공통 빈 상태 블록.
 */
export function EmptyState({
  title,
  message,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="text-muted-foreground [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
      ) : null}
      {title ? (
        <p className="text-sm font-medium text-foreground">{title}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
