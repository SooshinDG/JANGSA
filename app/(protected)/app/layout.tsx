import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SupabaseAppStateProvider } from "@/components/providers/supabase-app-state-provider";
import { StoreAccessProvider } from "@/components/providers/store-access-context";
import { UserMenu } from "@/components/auth/user-menu";
import { requireStoreContext } from "@/lib/auth/guards";

/**
 * 보호 영역 `/app/*` 의 공통 레이아웃.
 *
 * Context 계층:
 *   StoreAccessProvider  (canWrite / storeId)
 *     SupabaseAppStateProvider  (settings / entries / CRUD)
 *       AppShell (sidebar + topbar)
 *         UserMenu + children
 *
 * 무료 서비스 전환 후: TrialBanner 및 accessStatus 제거.
 */
export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email, store } = await requireStoreContext();

  return (
    <StoreAccessProvider storeId={store.id}>
      <SupabaseAppStateProvider storeId={store.id}>
        <AppShell>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <UserMenu email={email} storeName={store.store_name} />
            </div>
            {children}
          </div>
        </AppShell>
      </SupabaseAppStateProvider>
    </StoreAccessProvider>
  );
}
