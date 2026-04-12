import { createContext, useContext } from "react";
import type { AppSettings, DailyEntry } from "@/types";

/**
 * 앱 데이터 상태 Context 의 공유 인터페이스.
 *
 * 두 가지 Provider 가 이 인터페이스를 구현한다:
 * - `AppStateProvider` (Dexie 기반 — legacy 경로용)
 * - `SupabaseAppStateProvider` (Supabase 기반 — /app 보호 경로용)
 *
 * 하위 hooks(useSettings, useEntries, useAppState, useComputedMetrics)와
 * 모든 UI 컴포넌트는 이 인터페이스에만 의존하므로
 * Provider 교체 시 UI 코드 변경이 필요 없다.
 */

export interface AppStateContextValue {
  /** 초기 로드 중 여부 */
  loading: boolean;
  /** 초기화 오류 메시지 */
  error: string | null;

  /** 앱 설정 (로드 전에는 null) */
  settings: AppSettings | null;
  /** 모든 일별 엔트리 (date 오름차순) */
  entries: DailyEntry[];

  // ---- settings ----
  /** 설정 일부/전체 업데이트. 최상위 키 기준 얕은 병합. */
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  // ---- entries CRUD ----
  /** 특정 월(YYYY-MM)의 엔트리만 필터링해 반환 */
  getEntriesByMonth: (month: string) => DailyEntry[];
  /** 단일 엔트리 업서트 (id 기준) */
  upsertEntry: (entry: DailyEntry) => Promise<void>;
  /** 여러 엔트리 일괄 업서트 */
  upsertEntries: (list: DailyEntry[]) => Promise<void>;
  /** 엔트리 삭제 */
  deleteEntry: (id: string) => Promise<void>;
  /** 모든 엔트리 삭제 (설정은 유지) */
  clearEntries: () => Promise<void>;

  // ---- sample / reset ----
  /** 샘플 엔트리 생성 후 DB 에 주입 */
  seedSampleData: (month?: string) => Promise<void>;
  /** 설정/엔트리 초기화 후 기본값 재주입 */
  resetAllData: () => Promise<void>;
}

export const AppStateContext =
  createContext<AppStateContextValue | null>(null);

export function useAppStateContext(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error(
      "useAppStateContext 는 AppStateProvider 또는 SupabaseAppStateProvider 안에서만 사용할 수 있습니다.",
    );
  }
  return ctx;
}
