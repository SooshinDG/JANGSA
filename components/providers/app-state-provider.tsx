"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings, DailyEntry } from "@/types";
import { getDb } from "@/lib/db/dexie";
import { META_KEY, SETTINGS_KEY } from "@/lib/constants/defaults";
import {
  buildDefaultMeta,
  buildDefaultSettings,
  normalizeSettings,
} from "@/lib/utils/default-state";
import { createSampleEntries, sanitizeEntry } from "@/lib/utils/sample-data";
import { currentYearMonth } from "@/lib/utils/date";
import {
  AppStateContext,
  type AppStateContextValue,
} from "./app-state-context";

export type { AppStateContextValue } from "./app-state-context";
export { useAppStateContext } from "./app-state-context";

/**
 * Dexie(IndexedDB) 기반 전역 상태 Provider.
 * Legacy 경로(`/dashboard`, `/entries` 등)에서만 사용된다.
 * `/app/*` 보호 경로는 SupabaseAppStateProvider 를 사용한다.
 */

interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  // ---- 초기 로드 ----
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const db = getDb();

        // settings 로드 (없으면 기본값 주입)
        const existingSettings = await db.settings.get(SETTINGS_KEY);
        let appSettings: AppSettings;
        if (!existingSettings) {
          appSettings = buildDefaultSettings();
          await db.settings.put({ key: SETTINGS_KEY, value: appSettings });
        } else {
          appSettings = normalizeSettings(existingSettings.value);
        }

        // meta 로드 (없으면 기본값 주입)
        const existingMeta = await db.meta.get(META_KEY);
        if (!existingMeta) {
          await db.meta.put({ key: META_KEY, value: buildDefaultMeta() });
        }

        // entries 로드
        const allEntries = await db.entries.orderBy("date").toArray();

        if (!cancelled) {
          setSettings(appSettings);
          setEntries(allEntries);
          setLoading(false);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        if (!cancelled) {
          setError(`로컬 저장소 초기화 실패: ${message}`);
          // IndexedDB 실패 시에도 메모리상 기본값은 제공
          setSettings(buildDefaultSettings());
          setEntries([]);
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- settings 업데이트 ----
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const db = getDb();
    const current =
      (await db.settings.get(SETTINGS_KEY))?.value ?? buildDefaultSettings();
    const next = normalizeSettings({ ...current, ...patch });
    await db.settings.put({ key: SETTINGS_KEY, value: next });
    setSettings(next);
  }, []);

  // ---- entries 조회 ----
  const getEntriesByMonth = useCallback(
    (month: string) => entries.filter((e) => e.month === month),
    [entries],
  );

  // ---- entries 업서트 ----
  const upsertEntry = useCallback(async (entry: DailyEntry) => {
    const now = Date.now();
    const safe = sanitizeEntry({
      ...entry,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    });
    const db = getDb();
    await db.entries.put(safe);
    const all = await db.entries.orderBy("date").toArray();
    setEntries(all);
  }, []);

  const upsertEntries = useCallback(async (list: DailyEntry[]) => {
    const now = Date.now();
    const safe = list.map((entry) =>
      sanitizeEntry({
        ...entry,
        createdAt: entry.createdAt || now,
        updatedAt: now,
      }),
    );
    const db = getDb();
    await db.entries.bulkPut(safe);
    const all = await db.entries.orderBy("date").toArray();
    setEntries(all);
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const db = getDb();
    await db.entries.delete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearEntries = useCallback(async () => {
    const db = getDb();
    await db.entries.clear();
    setEntries([]);
  }, []);

  // ---- 샘플 / 리셋 ----
  const seedSampleData = useCallback(async (month?: string) => {
    const targetMonth = month ?? currentYearMonth();
    const sample = createSampleEntries(targetMonth);
    const db = getDb();
    await db.entries.bulkPut(sample);
    const all = await db.entries.orderBy("date").toArray();
    setEntries(all);
  }, []);

  const resetAllData = useCallback(async () => {
    const db = getDb();
    await db.transaction(
      "rw",
      db.settings,
      db.entries,
      db.meta,
      async () => {
        await db.settings.clear();
        await db.entries.clear();
        await db.meta.clear();
      },
    );
    const fresh = buildDefaultSettings();
    await db.settings.put({ key: SETTINGS_KEY, value: fresh });
    await db.meta.put({ key: META_KEY, value: buildDefaultMeta() });
    setSettings(fresh);
    setEntries([]);
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      loading,
      error,
      settings,
      entries,
      updateSettings,
      getEntriesByMonth,
      upsertEntry,
      upsertEntries,
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
      upsertEntries,
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

// useAppStateContext 는 ./app-state-context.ts 에서 re-export 됩니다.
