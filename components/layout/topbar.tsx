"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/app/dashboard", label: "대시보드" },
  { href: "/app/entries", label: "매출 입력" },
  { href: "/app/settlement", label: "월별 정산" },
  { href: "/app/settings", label: "설정" },
  { href: "/app/backup", label: "백업/복원" },
  { href: "/app/billing", label: "결제" },
] as const;

function currentPageLabel(pathname: string | null): string {
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
  );
  return match?.label ?? "대시보드";
}

export function Topbar() {
  const pathname = usePathname();
  const pageLabel = currentPageLabel(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground md:hidden"
          aria-label="메뉴 열기"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            관리 콘솔
          </span>
          <h1 className="text-base font-semibold text-foreground">
            {pageLabel}
          </h1>
        </div>
      </div>

      <nav aria-label="상단 빠른 이동" className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
