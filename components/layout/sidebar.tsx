"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookPen,
  Calculator,
  Settings,
  DatabaseBackup,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/app/entries", label: "매출 입력", icon: NotebookPen },
  { href: "/app/settlement", label: "월별 정산", icon: Calculator },
  { href: "/app/settings", label: "설정", icon: Settings },
  { href: "/app/backup", label: "백업 / 복원", icon: DatabaseBackup },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
      {/* 로고 */}
      <div className="flex h-12 items-center border-b border-border px-5">
        <Link href="/app/dashboard" className="flex items-center gap-2.5 group">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground select-none shadow-sm group-hover:shadow-md transition-shadow">
            장
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            장사 계산기
          </span>
        </Link>
      </div>

      {/* 내비게이션 */}
      <nav aria-label="주 메뉴" className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/[0.07] text-primary font-medium"
                  : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 푸터 */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-[11px] font-medium text-muted-foreground/70 leading-relaxed">
          모든 데이터는 Supabase에 안전하게 저장됩니다.
        </p>
      </div>
    </aside>
  );
}
