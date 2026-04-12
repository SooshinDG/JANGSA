import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AppStateProvider } from "@/components/providers/app-state-provider";

/**
 * 레거시(Dexie 기반) 경로 전용 레이아웃.
 *
 * 이 경로들은 `/dashboard`, `/entries` 등과 같이 SaaS 전환 이전의 URL 을 유지하며,
 * 로그인 없이도 접근 가능한 로컬 MVP 동작을 그대로 제공한다.
 * 향후 단계에서 `/app/*` 로 완전히 이관되면 이 route group 째로 제거될 예정이다.
 */
export default function LegacyLayout({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AppShell>{children}</AppShell>
    </AppStateProvider>
  );
}
