import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings, DailyEntry, ChannelKey } from "@/types";
import {
  buildDefaultSettings,
  normalizeSettings,
} from "@/lib/utils/default-state";

/**
 * Supabase ↔ 프론트 타입 어댑터 + 쿼리 함수.
 *
 * 원칙:
 * - DB 는 flat snake_case 컬럼, 프론트는 nested camelCase 타입
 * - 어댑터 함수가 양방향 변환을 담당
 * - 쿼리 함수는 SupabaseClient(browser) + storeId 를 받아 RLS 스코프 안에서 동작
 * - React 의존 없음 (순수 함수 + async)
 */

/* ================================================================== */
/* Type adapters                                                       */
/* ================================================================== */

/* ---------- store_settings ---------- */

interface StoreSettingsRow {
  store_id: string;
  currency: string;
  channels: Record<string, unknown>;
  cost_rules: Record<string, unknown>;
  goal_settings: Record<string, unknown>;
  fixed_costs: Record<string, unknown>;
}

export function dbSettingsRowToAppSettings(
  row: StoreSettingsRow,
): AppSettings {
  // DB 의 jsonb 컬럼은 snake_case 키로 저장되어 있을 수도 있지만,
  // bootstrap 에서 buildDefaultSettings() 의 camelCase 구조 그대로 넣었으므로
  // 일단 그대로 받아들이되, normalizeSettings 로 누락/스키마 변경에 대비한다.
  // DB jsonb 컬럼은 any-shaped object 이므로 unknown 을 거쳐 변환.
  // normalizeSettings 가 누락 필드를 기본값으로 채워 준다.
  return normalizeSettings({
    channels: row.channels as unknown as AppSettings["channels"],
    costRules: row.cost_rules as unknown as AppSettings["costRules"],
    goalSettings: row.goal_settings as unknown as AppSettings["goalSettings"],
    fixedCosts: row.fixed_costs as unknown as AppSettings["fixedCosts"],
    currency: row.currency,
  });
}

export function appSettingsToDbColumns(
  settings: AppSettings,
  storeId: string,
) {
  return {
    store_id: storeId,
    currency: settings.currency,
    channels: settings.channels,
    cost_rules: settings.costRules,
    goal_settings: settings.goalSettings,
    fixed_costs: settings.fixedCosts,
  };
}

/* ---------- daily_entries ---------- */

interface DailyEntryRow {
  id: string;
  store_id: string;
  entry_date: string; // "YYYY-MM-DD"
  entry_month: string;
  sales_baemin: number;
  sales_yogiyo: number;
  sales_coupang: number;
  sales_pos: number;
  refund_amount: number;
  daily_ad_cost: number;
  extra_variable_cost: number;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export function dbEntryRowToDailyEntry(row: DailyEntryRow): DailyEntry {
  return {
    // UI 에서는 entry_date 문자열을 id 로 사용 (기존 Dexie 규약 호환)
    id: row.entry_date,
    date: row.entry_date,
    month: row.entry_month,
    sales: {
      baemin: Number(row.sales_baemin) || 0,
      yogiyo: Number(row.sales_yogiyo) || 0,
      coupang: Number(row.sales_coupang) || 0,
      pos: Number(row.sales_pos) || 0,
    },
    refundAmount: Number(row.refund_amount) || 0,
    dailyAdCost: Number(row.daily_ad_cost) || 0,
    extraVariableCost: Number(row.extra_variable_cost) || 0,
    memo: row.memo ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
  };
}

export function dailyEntryToUpsertRow(
  entry: DailyEntry,
  storeId: string,
) {
  return {
    store_id: storeId,
    entry_date: entry.date,
    entry_month: entry.month || entry.date.slice(0, 7),
    sales_baemin: Math.max(0, entry.sales.baemin || 0),
    sales_yogiyo: Math.max(0, entry.sales.yogiyo || 0),
    sales_coupang: Math.max(0, entry.sales.coupang || 0),
    sales_pos: Math.max(0, entry.sales.pos || 0),
    refund_amount: Math.max(0, entry.refundAmount || 0),
    daily_ad_cost: Math.max(0, entry.dailyAdCost || 0),
    extra_variable_cost: Math.max(0, entry.extraVariableCost || 0),
    memo: entry.memo || null,
  };
}

/* ================================================================== */
/* Query functions                                                     */
/* ================================================================== */

function throwOnError(label: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

/* ---------- store_settings ---------- */

export async function fetchStoreSettings(
  supabase: SupabaseClient,
  storeId: string,
): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreSettingsRow>();

  throwOnError("설정을 불러오지 못했습니다", error);

  if (!data) {
    // bootstrap 이 생성했어야 하지만, 방어적 fallback
    return buildDefaultSettings();
  }

  return dbSettingsRowToAppSettings(data);
}

export async function saveStoreSettings(
  supabase: SupabaseClient,
  storeId: string,
  settings: AppSettings,
): Promise<void> {
  const { error } = await supabase
    .from("store_settings")
    .update({
      currency: settings.currency,
      channels: settings.channels,
      cost_rules: settings.costRules,
      goal_settings: settings.goalSettings,
      fixed_costs: settings.fixedCosts,
    })
    .eq("store_id", storeId);

  throwOnError("설정을 저장하지 못했습니다", error);
}

/* ---------- daily_entries ---------- */

export async function fetchAllEntries(
  supabase: SupabaseClient,
  storeId: string,
): Promise<DailyEntry[]> {
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("store_id", storeId)
    .order("entry_date", { ascending: true })
    .returns<DailyEntryRow[]>();

  throwOnError("매출 데이터를 불러오지 못했습니다", error);

  return (data ?? []).map(dbEntryRowToDailyEntry);
}

export async function upsertDailyEntry(
  supabase: SupabaseClient,
  storeId: string,
  entry: DailyEntry,
): Promise<void> {
  const row = dailyEntryToUpsertRow(entry, storeId);
  const { error } = await supabase
    .from("daily_entries")
    .upsert(row, { onConflict: "store_id,entry_date" });

  throwOnError("매출 데이터를 저장하지 못했습니다", error);
}

export async function upsertDailyEntries(
  supabase: SupabaseClient,
  storeId: string,
  entries: DailyEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const rows = entries.map((e) => dailyEntryToUpsertRow(e, storeId));
  const { error } = await supabase
    .from("daily_entries")
    .upsert(rows, { onConflict: "store_id,entry_date" });

  throwOnError("매출 데이터를 일괄 저장하지 못했습니다", error);
}

export async function deleteDailyEntry(
  supabase: SupabaseClient,
  storeId: string,
  entryDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("daily_entries")
    .delete()
    .eq("store_id", storeId)
    .eq("entry_date", entryDate);

  throwOnError("매출 데이터를 삭제하지 못했습니다", error);
}

export async function clearAllEntries(
  supabase: SupabaseClient,
  storeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("daily_entries")
    .delete()
    .eq("store_id", storeId);

  throwOnError("매출 데이터 전체 삭제에 실패했습니다", error);
}
