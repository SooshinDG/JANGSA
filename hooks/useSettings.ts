"use client";

import type { AppSettings } from "@/types";
import { useAppStateContext } from "@/components/providers/app-state-context";

export interface UseSettingsResult {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  /** 최상위 키 기준 얕은 병합 업데이트 */
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

/**
 * 앱 설정 전용 훅.
 * 편집 폼은 이후 단계에서 이 훅에 연결한다.
 */
export function useSettings(): UseSettingsResult {
  const { settings, loading, error, updateSettings } = useAppStateContext();
  return { settings, loading, error, updateSettings };
}
