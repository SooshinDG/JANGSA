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
  { href: "/app/backup", label: "백업" },
] as const;

function currentPageLabel(pathname: string | null): string {
  const match = NAV_ITEMS.find(
    (item) =>
      pathname === item.href || pathname?.startsWith(`${item.href}/`),
  );
  return match?.label ?? "대시보드";
}

export function Topbar() {
  const pathname = usePathname();
  const pageLabel = currentPageLabel(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm md:px-5">
      {/* 왼쪽: 모바일 메뉴 버튼 + 페이지 레이블 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors md:hidden"
          aria-label="메뉴 열기"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40 hidden md:block">
            장사 계산기
          </p>
          <h1 className="text-sm font-semibold text-foreground leading-none">
            {pageLabel}
          </h1>
        </div>
      </div>

      {/* 오른쪽: 빠른 이동 (데스크톱) */}
      <nav aria-label="상단 빠른 이동" className="hidden items-center gap-0.5 md:flex">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary/[0.07] text-primary"
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
