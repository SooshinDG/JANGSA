import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AppStateProvider } from "@/components/providers/app-state-provider";

/**
 * 레거시(Dexie 기반) 경로 전용 레이아웃.
 *
 * ⚠️ 이 경로들은 SaaS 전환 이후 더 이상 실사용 경로가 아니다.
 * `/app/*` 로 완전히 이관되었으며, 이 route group 은 곧 제거된다.
 */
export default function LegacyLayout({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AppShell>
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          />
          <div>
            <p className="font-semibold">
              이 주소는 곧 제거됩니다.
            </p>
            <p className="mt-0.5 text-amber-800/80">
              새로운 경로인{" "}
              <Link
                href="/app/dashboard"
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                /app/dashboard
              </Link>
              를 사용해 주세요. 로그인이 필요합니다.
            </p>
          </div>
        </div>
        {children}
      </AppShell>
    </AppStateProvider>
  );
}
