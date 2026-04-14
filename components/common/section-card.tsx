import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** 카드 내부 패딩 제거가 필요한 경우 (차트 full-bleed 등) */
  noPadding?: boolean;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  actions,
  footer,
  className,
  noPadding = false,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-col gap-1.5 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            ) : null}
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={cn(noPadding ? "" : "px-4 py-3.5")}>{children}</div>
      {footer ? (
        <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
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

export function Placeholder({ label, hint, className }: PlaceholderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[6rem] flex-col items-start justify-center rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-5 text-sm",
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
