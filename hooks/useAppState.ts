"use client";

import {
  useAppStateContext,
  type AppStateContextValue,
} from "@/components/providers/app-state-context";

/**
 * 전체 앱 상태를 한 번에 꺼내는 훅.
 * 세부 영역만 필요하면 useSettings / useEntries 를 사용하자.
 */
export function useAppState(): AppStateContextValue {
  return useAppStateContext();
}
