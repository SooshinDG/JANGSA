import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SupabaseAppStateProvider } from "@/components/providers/supabase-app-state-provider";
import { StoreAccessProvider } from "@/components/providers/store-access-context";
import { TrialBanner } from "@/components/auth/trial-banner";
import { UserMenu } from "@/components/auth/user-menu";
import { requireStoreContext } from "@/lib/auth/guards";

/**
 * 보호 영역 `/app/*` 의 공통 레이아웃.
 *
 * Context 계층:
 *   StoreAccessProvider  (accessStatus / canWrite / storeId)
 *     SupabaseAppStateProvider  (settings / entries / CRUD)
 *       AppShell (sidebar + topbar)
 *         TrialBanner + UserMenu + children
 */
export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email, store, accessStatus } = await requireStoreContext();

  return (
    <StoreAccessProvider accessStatus={accessStatus} storeId={store.id}>
      <SupabaseAppStateProvider storeId={store.id}>
        <AppShell>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <UserMenu email={email} storeName={store.store_name} />
            </div>
            <TrialBanner store={store} accessStatus={accessStatus} />
            {children}
          </div>
        </AppShell>
      </SupabaseAppStateProvider>
    </StoreAccessProvider>
  );
}
