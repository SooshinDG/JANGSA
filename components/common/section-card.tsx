import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  actions,
  footer,
  className,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-col gap-2 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold text-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className="px-5 py-5">{children}</div>
      {footer ? (
        <footer className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

interface PlaceholderProps {
  label: string;
  hint?: string;
  className?: string;
}

/**
 * 이후 단계에서 실제 UI로 교체될 자리 표시용 블록.
 * 단순 회색 박스가 아니라 다음 단계 작업 포인트를 명시한다.
 */
export function Placeholder({ label, hint, className }: PlaceholderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[7rem] flex-col items-start justify-center rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm",
        className,
      )}
    >
      <span className="font-medium text-foreground">{label}</span>
      {hint ? (
        <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
