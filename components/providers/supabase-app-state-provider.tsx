"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings, DailyEntry } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchStoreSettings,
  saveStoreSettings,
  fetchAllEntries,
  upsertDailyEntry,
  upsertDailyEntries,
  deleteDailyEntry,
  clearAllEntries,
} from "@/lib/supabase/data-access";
import {
  buildDefaultSettings,
  normalizeSettings,
} from "@/lib/utils/default-state";
import { createSampleEntries, sanitizeEntry } from "@/lib/utils/sample-data";
import { currentYearMonth } from "@/lib/utils/date";
import { AppStateContext } from "./app-state-context";

/**
 * Supabase Postgres 기반 AppState Provider.
 *
 * `/app/*` 보호 경로에서만 사용된다.
 * 기존 `AppStateContextValue` 인터페이스를 그대로 구현하므로
 * 하위 hooks 와 UI 컴포넌트는 교체 사실을 알 필요 없다.
 *
 * 데이터 흐름:
 * 1. mount → fetchStoreSettings + fetchAllEntries (Supabase)
 * 2. state 에 캐시
 * 3. CRUD 메서드 → Supabase write → 성공 시 로컬 state merge
 *
 * 실패 시 state 를 오염시키지 않는다 (non-optimistic).
 */

interface Props {
  storeId: string;
  children: ReactNode;
}

export function SupabaseAppStateProvider({ storeId, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  // browser client 는 한 번만 생성
  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getClient(): SupabaseClient {
    if (!supabaseRef.current) {
      supabaseRef.current = createSupabaseBrowserClient();
    }
    return supabaseRef.current;
  }

  /* ---- 초기 로드 ---- */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const client = getClient();
        const [s, e] = await Promise.all([
          fetchStoreSettings(client, storeId),
          fetchAllEntries(client, storeId),
        ]);
        if (!cancelled) {
          setSettings(s);
          setEntries(e);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.";
          setError(msg);
          setSettings(buildDefaultSettings());
          setEntries([]);
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  /* ---- settings ---- */

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const client = getClient();
      const current = settings ?? buildDefaultSettings();
      const next = normalizeSettings({ ...current, ...patch });
      await saveStoreSettings(client, storeId, next);
      setSettings(next);
    },
    [settings, storeId],
  );

  /* ---- entries read ---- */

  const getEntriesByMonth = useCallback(
    (month: string) => entries.filter((e) => e.month === month),
    [entries],
  );

  /* ---- entries write helpers ---- */

  /** entries state 에서 entry 1건을 merge (날짜순 유지) */
  function mergeEntryIntoList(
    list: DailyEntry[],
    entry: DailyEntry,
  ): DailyEntry[] {
    const idx = list.findIndex((e) => e.date === entry.date);
    const next = [...list];
    if (idx >= 0) {
      next[idx] = entry;
    } else {
      next.push(entry);
      next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
    return next;
  }

  const upsertEntry = useCallback(
    async (entry: DailyEntry) => {
      const safe = sanitizeEntry(entry);
      const client = getClient();
      await upsertDailyEntry(client, storeId, safe);
      setEntries((prev) => mergeEntryIntoList(prev, safe));
    },
    [storeId],
  );

  const upsertEntries_ = useCallback(
    async (list: DailyEntry[]) => {
      const safe = list.map((e) => sanitizeEntry(e));
      const client = getClient();
      await upsertDailyEntries(client, storeId, safe);
      setEntries((prev) => {
        let merged = [...prev];
        for (const entry of safe) {
          merged = mergeEntryIntoList(merged, entry);
        }
        return merged;
      });
    },
    [storeId],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      // id = date string (기존 규약)
      const client = getClient();
      await deleteDailyEntry(client, storeId, id);
      setEntries((prev) => prev.filter((e) => e.date !== id));
    },
    [storeId],
  );

  const clearEntries = useCallback(async () => {
    const client = getClient();
    await clearAllEntries(client, storeId);
    setEntries([]);
  }, [storeId]);

  /* ---- sample / reset ---- */

  const seedSampleData = useCallback(
    async (month?: string) => {
      const targetMonth = month ?? currentYearMonth();
      const samples = createSampleEntries(targetMonth);
      const client = getClient();
      await upsertDailyEntries(client, storeId, samples);
      // merge into state
      setEntries((prev) => {
        let merged = [...prev];
        for (const entry of samples) {
          merged = mergeEntryIntoList(merged, entry);
        }
        return merged;
      });
    },
    [storeId],
  );

  const resetAllData = useCallback(async () => {
    const client = getClient();
    await clearAllEntries(client, storeId);
    const fresh = buildDefaultSettings();
    await saveStoreSettings(client, storeId, fresh);
    setSettings(fresh);
    setEntries([]);
  }, [storeId]);

  /* ---- context value ---- */

  const value = useMemo(
    () => ({
      loading,
      error,
      settings,
      entries,
      updateSettings,
      getEntriesByMonth,
      upsertEntry,
      upsertEntries: upsertEntries_,
      deleteEntry,
      clearEntries,
      seedSampleData,
      resetAllData,
    }),
    [
      loading,
      error,
      settings,
      entries,
      updateSettings,
      getEntriesByMonth,
      upsertEntry,
      upsertEntries_,
      deleteEntry,
      clearEntries,
      seedSampleData,
      resetAllData,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
