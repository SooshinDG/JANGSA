"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * 현재 store 의 접근 권한 정보를 하위 컴포넌트에 전달하는 Context.
 *
 * 무료 서비스 전환 후: canWrite 는 항상 true, accessStatus 제거.
 * `/app/*` 보호 영역 레이아웃에서 `requireStoreContext()` 의 결과를 주입한다.
 */

export interface StoreAccessContextValue {
  /** 항상 true — 무료 서비스로 전환 후 모든 쓰기 허용 */
  canWrite: true;
  /** 현재 매장 ID (backup 등에서 사용) */
  storeId: string;
}

const StoreAccessContext = createContext<StoreAccessContextValue | null>(null);

interface ProviderProps {
  storeId: string;
  children: ReactNode;
}

export function StoreAccessProvider({
  storeId,
  children,
}: ProviderProps) {
  const value: StoreAccessContextValue = {
    canWrite: true,
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
