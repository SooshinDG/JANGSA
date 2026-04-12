"use client";

import type { DailyEntry } from "@/types";
import { useAppStateContext } from "@/components/providers/app-state-context";

export interface UseEntriesResult {
  entries: DailyEntry[];
  loading: boolean;
  getEntriesByMonth: (month: string) => DailyEntry[];
  upsertEntry: (entry: DailyEntry) => Promise<void>;
  upsertEntries: (list: DailyEntry[]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearEntries: () => Promise<void>;
}

/**
 * 일별 매출 엔트리 CRUD 전용 훅.
 * 입력 테이블과 정산 집계는 이후 단계에서 이 훅을 기반으로 붙인다.
 *
 * 저장 정책 (README에도 명시):
 * - 기본 키: id (문자열). `upsert*`는 id 기준으로 덮어쓴다.
 * - date(YYYY-MM-DD)와 month(YYYY-MM)는 인덱스로 조회에만 사용한다.
 * - 같은 날짜에 대해 중복 입력 방지가 필요한 경우, 호출부에서
 *   "id = date" 규칙을 사용하면 자동으로 덮어쓰기 효과가 된다.
 */
export function useEntries(): UseEntriesResult {
  const {
    entries,
    loading,
    getEntriesByMonth,
    upsertEntry,
    upsertEntries,
    deleteEntry,
    clearEntries,
  } = useAppStateContext();

  return {
    entries,
    loading,
    getEntriesByMonth,
    upsertEntry,
    upsertEntries,
    deleteEntry,
    clearEntries,
  };
}
