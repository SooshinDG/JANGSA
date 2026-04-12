"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccessStatus } from "@/lib/auth/types";
import { isWriteAllowed } from "@/lib/auth/access";

/**
 * 현재 store 의 접근 권한 정보를 하위 컴포넌트에 전달하는 Context.
 *
 * `AppStateContextValue` 와 분리되어 있어 legacy Dexie provider 를 건드리지 않는다.
 * `/app/*` 보호 영역 레이아웃에서 `requireStoreContext()` 의 결과를 주입한다.
 */

export interface StoreAccessContextValue {
  /** 현재 매장의 접근 상태 */
  accessStatus: AccessStatus;
  /** trialing / active 일 때만 true (settings/entries 쓰기 허용) */
  canWrite: boolean;
  /** 현재 매장 ID (backup 등에서 사용) */
  storeId: string;
}

const StoreAccessContext = createContext<StoreAccessContextValue | null>(null);

interface ProviderProps {
  accessStatus: AccessStatus;
  storeId: string;
  children: ReactNode;
}

export function StoreAccessProvider({
  accessStatus,
  storeId,
  children,
}: ProviderProps) {
  const value: StoreAccessContextValue = {
    accessStatus,
    canWrite: isWriteAllowed(accessStatus),
    storeId,
  };

  return (
    <StoreAccessContext.Provider value={value}>
      {children}
    </StoreAccessContext.Provider>
  );
}

/**
 * 현재 store 의 접근 상태를 읽는 hook.
 * `/app/*` 보호 영역 내부에서만 사용할 수 있다.
 */
export function useStoreAccess(): StoreAccessContextValue {
  const ctx = useContext(StoreAccessContext);
  if (!ctx) {
    throw new Error(
      "useStoreAccess 는 StoreAccessProvider 안에서만 사용할 수 있습니다.",
    );
  }
  return ctx;
}
