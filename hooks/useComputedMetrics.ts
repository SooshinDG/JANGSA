"use client";

import { useCallback, useMemo } from "react";
import type {
  DailyComputedMetrics,
  DailyEntry,
  DashboardSnapshot,
  MonthlyComputedMetrics,
} from "@/types";
import { useAppState } from "@/hooks/useAppState";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import {
  computeDailyMetrics,
  computeMonthlyMetrics,
  getCurrentMonthMetrics,
  getTodayMetrics,
} from "@/lib/calc";

export interface UseComputedMetricsResult {
  /** 단일 DailyEntry 를 derive 한 지표 반환 */
  getDailyComputed: (entry: DailyEntry) => DailyComputedMetrics;
  /** 특정 month ("YYYY-MM") 의 월 지표 반환 */
  getMonthlyComputed: (month: string) => MonthlyComputedMetrics;
  /** 오늘 일별 스냅샷 */
  getTodaySnapshot: (today?: Date) => DailyComputedMetrics;
  /** 현재 달 월 스냅샷 */
  getCurrentMonthSnapshot: (today?: Date) => MonthlyComputedMetrics;
  /** 오늘 + 이번 달 합본 스냅샷 */
  getDashboardSnapshot: (today?: Date) => DashboardSnapshot;
}

/**
 * 파생(계산) 지표 전용 훅.
 *
 * 원칙:
 * - Context/Provider 에는 원본 데이터만 보관하고,
 *   이 훅은 매 호출 시 `lib/calc` 순수 함수를 호출해 derive 한다.
 * - settings 가 아직 로드 전이면 기본값으로 fallback 해 UI 가 깨지지 않게 한다.
 */
export function useComputedMetrics(): UseComputedMetricsResult {
  const { entries, settings } = useAppState();

  const effectiveSettings = useMemo(
    () => settings ?? buildDefaultSettings(),
    [settings],
  );

  const getDailyComputed = useCallback(
    (entry: DailyEntry) => computeDailyMetrics(entry, effectiveSettings),
    [effectiveSettings],
  );

  const getMonthlyComputed = useCallback(
    (month: string) => computeMonthlyMetrics(entries, effectiveSettings, month),
    [entries, effectiveSettings],
  );

  const getTodaySnapshot = useCallback(
    (today?: Date) => getTodayMetrics(entries, effectiveSettings, today),
    [entries, effectiveSettings],
  );

  const getCurrentMonthSnapshot = useCallback(
    (today?: Date) =>
      getCurrentMonthMetrics(entries, effectiveSettings, today),
    [entries, effectiveSettings],
  );

  const getDashboardSnapshot = useCallback(
    (today?: Date): DashboardSnapshot => ({
      today: getTodayMetrics(entries, effectiveSettings, today),
      currentMonth: getCurrentMonthMetrics(entries, effectiveSettings, today),
      generatedAt: Date.now(),
    }),
    [entries, effectiveSettings],
  );

  return {
    getDailyComputed,
    getMonthlyComputed,
    getTodaySnapshot,
    getCurrentMonthSnapshot,
    getDashboardSnapshot,
  };
}
