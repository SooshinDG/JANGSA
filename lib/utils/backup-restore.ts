import type { AppSettings, DailyEntry } from "@/types";
import type { ParsedBackup } from "./import-validation";

/**
 * JSON 복원 적용 단계 (reset → settings → entries) 중 오류가 나면
 * 사전 스냅샷 기준으로 롤백을 시도하는 순수 플로우 헬퍼.
 *
 * - Provider API 는 기존 것을 그대로 사용한다 (수정 없음).
 * - DB 변경 *이전* 에 반드시 파일 검증이 끝나야 한다.
 *   (검증 실패라면 이 함수를 호출조차 하지 말 것)
 * - 롤백 자체가 실패할 수 있으므로 결과 타입으로 구분해 보고한다.
 */

export interface ImportSnapshot {
  settings: AppSettings;
  entries: DailyEntry[];
}

export type ImportOutcome = "success" | "rolled-back" | "rollback-failed";
export type ImportPhase = "reset" | "settings" | "entries";

export interface ImportResult {
  outcome: ImportOutcome;
  /** 성공 시 복원된 entries 수 */
  importedEntryCount: number;
  /** 파싱 단계에서 이미 제외된 entries 수 */
  droppedEntryCount: number;
  /** 롤백이 실행된 경우, 복구된 entries 수 */
  restoredEntryCount?: number;
  /** 어느 단계에서 import 가 실패했는지 */
  failedPhase?: ImportPhase;
  importError?: Error;
  rollbackError?: Error;
}

interface ProviderActions {
  resetAllData: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  upsertEntries: (list: DailyEntry[]) => Promise<void>;
}

function settingsToPatch(settings: AppSettings): Partial<AppSettings> {
  return {
    channels: settings.channels,
    costRules: settings.costRules,
    goalSettings: settings.goalSettings,
    fixedCosts: settings.fixedCosts,
    currency: settings.currency,
  };
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * 이미 검증이 완료된 ParsedBackup 을 실제 DB 에 반영한다.
 * import 단계 중 어느 곳에서든 예외가 나면 snapshot 으로 best-effort 롤백을 시도한다.
 */
export async function performRestoreWithRollback(
  parsed: ParsedBackup,
  snapshot: ImportSnapshot,
  actions: ProviderActions,
): Promise<ImportResult> {
  let failedPhase: ImportPhase = "reset";

  try {
    await actions.resetAllData();
    failedPhase = "settings";
    await actions.updateSettings(settingsToPatch(parsed.settings));
    if (parsed.entries.length > 0) {
      failedPhase = "entries";
      await actions.upsertEntries(parsed.entries);
    }
    return {
      outcome: "success",
      importedEntryCount: parsed.entries.length,
      droppedEntryCount: parsed.droppedEntryCount,
    };
  } catch (err) {
    const importError = toError(err);

    // Best-effort rollback to snapshot
    try {
      await actions.resetAllData();
      await actions.updateSettings(settingsToPatch(snapshot.settings));
      if (snapshot.entries.length > 0) {
        await actions.upsertEntries(snapshot.entries);
      }
      return {
        outcome: "rolled-back",
        importedEntryCount: 0,
        droppedEntryCount: parsed.droppedEntryCount,
        restoredEntryCount: snapshot.entries.length,
        failedPhase,
        importError,
      };
    } catch (rollbackErr) {
      return {
        outcome: "rollback-failed",
        importedEntryCount: 0,
        droppedEntryCount: parsed.droppedEntryCount,
        failedPhase,
        importError,
        rollbackError: toError(rollbackErr),
      };
    }
  }
}
