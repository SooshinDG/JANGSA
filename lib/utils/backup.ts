import type { AppSettings, DailyEntry } from "@/types";

/**
 * 백업 파일 스키마 / 파일명 유틸.
 */

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  version: number;
  exportedAt: string; // ISO 8601
  /** 백업 원본 store ID (메타데이터, import 시 강제 매핑 대상은 아님) */
  storeId?: string;
  settings: AppSettings;
  entries: DailyEntry[];
}

export function buildBackupPayload(
  settings: AppSettings,
  entries: DailyEntry[],
  storeId?: string,
): BackupFile {
  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    storeId,
    settings,
    entries,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `jangsa-backup-YYYY-MM-DD-HHmmss.json` */
export function buildBackupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  return `jangsa-backup-${y}-${m}-${d}-${hh}${mm}${ss}.json`;
}

/** `jangsa-YYYY-MM-settlement.csv` */
export function buildCsvFilename(month: string): string {
  return `jangsa-${month}-settlement.csv`;
}
