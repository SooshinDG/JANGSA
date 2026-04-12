import type {
  AppSettings,
  ChannelKey,
  ChannelSettings,
  DailyEntry,
} from "@/types";
import { normalizeSettings } from "@/lib/utils/default-state";
import { sanitizeEntry } from "@/lib/utils/sample-data";

/**
 * JSON 백업 파일 파싱 / 검증.
 * - 최소 스키마 검증 후 normalizeSettings / sanitizeEntry 로 보정
 * - 잘못된 entry 는 전체 실패 대신 건 단위로 스킵
 * - settings 가 심각하게 비정상이면 BackupImportError 를 던진다
 */

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupImportError";
  }
}

export interface ParsedBackup {
  settings: AppSettings;
  entries: DailyEntry[];
  droppedEntryCount: number;
  /** 백업 파일에 기록된 원본 store ID (메타데이터). import 대상은 현재 store. */
  sourceStoreId?: string;
}

const CHANNEL_KEYS: readonly ChannelKey[] = [
  "baemin",
  "yogiyo",
  "coupang",
  "pos",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function coerceBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * raw 객체에서 AppSettings 의 부분을 추출한다.
 * 완전히 보정되지 않은 Partial 상태이며, 이후 normalizeSettings 로 기본값을 채운다.
 */
function extractSettings(raw: unknown): Partial<AppSettings> | null {
  if (!isPlainObject(raw)) return null;

  const result: Partial<AppSettings> = {};

  if (isPlainObject(raw.channels)) {
    const channels: Partial<Record<ChannelKey, ChannelSettings>> = {};
    for (const key of CHANNEL_KEYS) {
      const ch = (raw.channels as Record<string, unknown>)[key];
      if (isPlainObject(ch)) {
        channels[key] = {
          label: coerceString(ch.label, key),
          enabled: coerceBoolean(ch.enabled, true),
          feeRate: coerceNumber(ch.feeRate, 0),
        };
      }
    }
    if (Object.keys(channels).length > 0) {
      // normalizeSettings 가 누락된 키는 기본값으로 채워준다
      result.channels = channels as Record<ChannelKey, ChannelSettings>;
    }
  }

  if (isPlainObject(raw.costRules)) {
    const cr = raw.costRules as Record<string, unknown>;
    result.costRules = {
      ingredientCostRate: coerceNumber(cr.ingredientCostRate, 0),
      packagingCostRate: coerceNumber(cr.packagingCostRate, 0),
    };
  }

  if (isPlainObject(raw.goalSettings)) {
    const gs = raw.goalSettings as Record<string, unknown>;
    result.goalSettings = {
      salesTarget: coerceNumber(gs.salesTarget, 0),
    };
  }

  if (isPlainObject(raw.fixedCosts)) {
    const fc = raw.fixedCosts as Record<string, unknown>;
    result.fixedCosts = {
      rent: coerceNumber(fc.rent, 0),
      labor: coerceNumber(fc.labor, 0),
      utilities: coerceNumber(fc.utilities, 0),
      marketing: coerceNumber(fc.marketing, 0),
      misc: coerceNumber(fc.misc, 0),
    };
  }

  if (typeof raw.currency === "string") {
    result.currency = raw.currency;
  }

  return result;
}

/**
 * 단일 entry 후보를 DailyEntry 로 정규화.
 * 최소 조건(id/date) 을 만족하지 않으면 null.
 */
function extractEntry(raw: unknown): DailyEntry | null {
  if (!isPlainObject(raw)) return null;

  const id = raw.id;
  const date = raw.date;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const sales = isPlainObject(raw.sales)
    ? (raw.sales as Record<string, unknown>)
    : {};

  const entry: DailyEntry = {
    id,
    date,
    month:
      typeof raw.month === "string" && /^\d{4}-\d{2}$/.test(raw.month)
        ? raw.month
        : date.slice(0, 7),
    sales: {
      baemin: coerceNumber(sales.baemin, 0),
      yogiyo: coerceNumber(sales.yogiyo, 0),
      coupang: coerceNumber(sales.coupang, 0),
      pos: coerceNumber(sales.pos, 0),
    },
    refundAmount: coerceNumber(raw.refundAmount, 0),
    dailyAdCost: coerceNumber(raw.dailyAdCost, 0),
    extraVariableCost: coerceNumber(raw.extraVariableCost, 0),
    memo: typeof raw.memo === "string" ? raw.memo : undefined,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };

  try {
    return sanitizeEntry(entry);
  } catch {
    return null;
  }
}

/**
 * JSON 문자열을 읽어 ParsedBackup 으로 반환.
 * - 잘못된 JSON → BackupImportError
 * - settings 없음 / 형식 오류 → BackupImportError
 * - entries 는 잘못된 항목을 필터링하고 유효한 것만 반환
 */
export function parseBackupJson(raw: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BackupImportError("JSON 형식이 올바르지 않습니다.");
  }

  if (!isPlainObject(data)) {
    throw new BackupImportError("백업 파일 최상위가 객체가 아닙니다.");
  }

  const rawSettings = data.settings;
  const extracted = extractSettings(rawSettings);
  if (!extracted) {
    throw new BackupImportError("복원 가능한 settings 데이터가 없습니다.");
  }

  const settings = normalizeSettings(extracted);

  let entries: DailyEntry[] = [];
  let droppedEntryCount = 0;

  if (Array.isArray(data.entries)) {
    for (const raw of data.entries) {
      const normalized = extractEntry(raw);
      if (normalized) {
        entries.push(normalized);
      } else {
        droppedEntryCount++;
      }
    }
  }

  // id 중복 제거 (동일 id 는 뒤의 값으로 덮어쓰기)
  const byId = new Map<string, DailyEntry>();
  for (const e of entries) byId.set(e.id, e);
  entries = Array.from(byId.values());

  const sourceStoreId =
    typeof (data as Record<string, unknown>).storeId === "string"
      ? ((data as Record<string, unknown>).storeId as string)
      : undefined;

  return { settings, entries, droppedEntryCount, sourceStoreId };
}
