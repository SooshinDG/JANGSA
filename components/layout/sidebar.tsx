"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookPen,
  Calculator,
  Settings,
  DatabaseBackup,
  CreditCard,
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
  { href: "/app/backup", label: "백업/복원", icon: DatabaseBackup },
  { href: "/app/billing", label: "결제 / 구독", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-white">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            J
          </span>
          <span className="text-base font-semibold text-foreground">
            장사 계산기
          </span>
        </Link>
      </div>

      <nav aria-label="주 메뉴" className="flex-1 space-y-1 p-4">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">로컬 저장형 MVP</p>
        <p className="mt-1 leading-relaxed">
          모든 데이터는 이 브라우저에만 저장됩니다.
        </p>
      </div>
    </aside>
  );
}
