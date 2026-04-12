"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileCheck2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { MonthPicker } from "@/components/common/month-picker";
import { useAppState } from "@/hooks/useAppState";
import { getEntriesForMonth } from "@/lib/calc";
import {
  buildBackupFilename,
  buildBackupPayload,
  buildCsvFilename,
} from "@/lib/utils/backup";
import { buildMonthlySettlementCsv } from "@/lib/utils/csv";
import { downloadCsv, downloadJson } from "@/lib/utils/download";
import {
  BackupImportError,
  parseBackupJson,
  type ParsedBackup,
} from "@/lib/utils/import-validation";
import {
  performRestoreWithRollback,
  type ImportSnapshot,
} from "@/lib/utils/backup-restore";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/* 액션 상태                                                            */
/* ------------------------------------------------------------------ */

type ActionStatus = "idle" | "working" | "success" | "error";

interface StatusState {
  status: ActionStatus;
  message?: string;
}

const IDLE: StatusState = { status: "idle" };

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* 메인 페이지                                                          */
/* ------------------------------------------------------------------ */

export default function BackupPage() {
  const {
    entries,
    settings,
    loading: appLoading,
    error: appError,
    updateSettings,
    upsertEntries,
    seedSampleData,
    resetAllData,
  } = useAppState();

  const [month, setMonth] = useState<string>(() => currentMonthKey());

  const [exportJsonStatus, setExportJsonStatus] = useState<StatusState>(IDLE);
  const [importJsonStatus, setImportJsonStatus] = useState<StatusState>(IDLE);
  const [exportCsvStatus, setExportCsvStatus] = useState<StatusState>(IDLE);
  const [seedStatus, setSeedStatus] = useState<StatusState>(IDLE);
  const [resetStatus, setResetStatus] = useState<StatusState>(IDLE);

  // Import 파일 선택 + 사전 검증 상태
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedBackup | null>(null);
  const [importPreviewError, setImportPreviewError] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const monthEntriesCount = useMemo(
    () => getEntriesForMonth(entries, month).length,
    [entries, month],
  );

  // 하나의 작업이 진행 중이면 다른 destructive 작업을 잠가 둔다
  const isBusy =
    exportJsonStatus.status === "working" ||
    importJsonStatus.status === "working" ||
    exportCsvStatus.status === "working" ||
    seedStatus.status === "working" ||
    resetStatus.status === "working";

  /** 작업 성공 시, 관련 없는 오래된 error 상태를 정리한다. */
  const clearStaleErrors = (keep: (x: StatusState) => boolean) => {
    const maybeClear = (
      s: StatusState,
      set: (next: StatusState) => void,
    ) => {
      if (s.status === "error" && !keep(s)) set(IDLE);
    };
    maybeClear(exportJsonStatus, setExportJsonStatus);
    maybeClear(importJsonStatus, setImportJsonStatus);
    maybeClear(exportCsvStatus, setExportCsvStatus);
    maybeClear(seedStatus, setSeedStatus);
  };

  /* -------- 1) JSON export -------- */

  const handleExportJson = () => {
    if (!settings) {
      setExportJsonStatus({
        status: "error",
        message: "설정이 아직 로드되지 않았습니다.",
      });
      return;
    }
    setExportJsonStatus({ status: "working" });
    try {
      const payload = buildBackupPayload(settings, entries);
      const filename = buildBackupFilename();
      downloadJson(filename, payload);
      setExportJsonStatus({
        status: "success",
        message: `${filename} 다운로드를 시작했습니다. (설정 1건 · 입력 ${entries.length.toLocaleString("ko-KR")}건)`,
      });
    } catch (e) {
      setExportJsonStatus({
        status: "error",
        message: e instanceof Error ? e.message : "JSON 내보내기에 실패했습니다.",
      });
    }
  };

  /* -------- 2) 샘플 데이터 주입 -------- */

  const handleSeed = async () => {
    setSeedStatus({ status: "working" });
    try {
      await seedSampleData(month);
      setSeedStatus({
        status: "success",
        message: `${month} 월 샘플 데이터를 주입했습니다. 대시보드·정산·입력 화면에서 바로 확인할 수 있습니다.`,
      });
      clearStaleErrors(() => false);
    } catch (e) {
      setSeedStatus({
        status: "error",
        message: e instanceof Error ? e.message : "샘플 주입에 실패했습니다.",
      });
    }
  };

  /* -------- 3) 전체 초기화 -------- */

  const handleReset = async () => {
    const ok1 = window.confirm(
      "전체 데이터를 초기화합니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?",
    );
    if (!ok1) return;
    const ok2 = window.confirm(
      "마지막 확인입니다. 설정·매출 입력·메타 정보가 모두 삭제되고 설정은 기본값으로 재생성됩니다. 진행하시겠습니까?",
    );
    if (!ok2) return;

    setResetStatus({ status: "working" });
    try {
      await resetAllData();
      setResetStatus({
        status: "success",
        message: "전체 데이터가 초기화되었습니다. 설정은 기본값으로 복원되었습니다.",
      });
      // 초기화 직후에는 다른 섹션의 오래된 성공/오류 메시지를 모두 정리한다.
      setExportJsonStatus(IDLE);
      setImportJsonStatus(IDLE);
      setExportCsvStatus(IDLE);
      setSeedStatus(IDLE);
      setImportFile(null);
      setImportPreview(null);
      setImportPreviewError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setResetStatus({
        status: "error",
        message: e instanceof Error ? e.message : "초기화에 실패했습니다.",
      });
    }
  };

  /* -------- 4) CSV export -------- */

  const handleExportCsv = () => {
    if (!settings) {
      setExportCsvStatus({
        status: "error",
        message: "설정이 아직 로드되지 않았습니다.",
      });
      return;
    }
    setExportCsvStatus({ status: "working" });
    try {
      const monthEntries = getEntriesForMonth(entries, month);
      if (monthEntries.length === 0) {
        setExportCsvStatus({
          status: "error",
          message: `${month} 월에 저장된 매출 데이터가 없습니다. 먼저 데이터를 입력하거나 샘플을 주입해 주세요.`,
        });
        return;
      }
      const csv = buildMonthlySettlementCsv(entries, settings, month);
      const filename = buildCsvFilename(month);
      downloadCsv(filename, csv);
      setExportCsvStatus({
        status: "success",
        message: `${filename} 다운로드를 시작했습니다. (${monthEntries.length}일 기록)`,
      });
    } catch (e) {
      setExportCsvStatus({
        status: "error",
        message: e instanceof Error ? e.message : "CSV 내보내기에 실패했습니다.",
      });
    }
  };

  /* -------- 5) JSON import (선택 → 검증 → 확인 → 적용) -------- */

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    setImportFile(file);
    setImportPreview(null);
    setImportPreviewError(null);
    setImportJsonStatus(IDLE);

    if (!file) return;

    // 파일을 선택하는 즉시 사전 검증을 수행한다. (DB 변경 없음)
    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      setImportPreview(parsed);
    } catch (e) {
      const msg =
        e instanceof BackupImportError
          ? e.message
          : e instanceof Error
            ? e.message
            : "JSON 파일을 읽는 중 오류가 발생했습니다.";
      setImportPreviewError(msg);
    }
  };

  const handleImportJson = async () => {
    if (!importPreview) {
      setImportJsonStatus({
        status: "error",
        message: "먼저 유효한 JSON 파일을 선택해 주세요.",
      });
      return;
    }
    if (!settings) {
      setImportJsonStatus({
        status: "error",
        message:
          "현재 설정이 로드되지 않아 복구용 스냅샷을 만들 수 없습니다. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }

    const confirmed = window.confirm(
      [
        "현재 데이터를 덮어쓰고 JSON 복원을 진행할까요?",
        "",
        "이 작업 전 자동 복구 시도를 위한 임시 스냅샷을 사용합니다.",
        "복원 중 오류가 발생하면 이전 상태로 되돌리기를 시도합니다.",
      ].join("\n"),
    );
    if (!confirmed) return;

    // DB 변경 직전 메모리 스냅샷 캡처
    const snapshot: ImportSnapshot = {
      settings,
      entries: [...entries],
    };

    setImportJsonStatus({ status: "working" });

    const result = await performRestoreWithRollback(importPreview, snapshot, {
      resetAllData,
      updateSettings,
      upsertEntries,
    });

    if (result.outcome === "success") {
      const droppedMsg =
        result.droppedEntryCount > 0
          ? ` · 제외된 항목 ${result.droppedEntryCount}건`
          : "";
      setImportJsonStatus({
        status: "success",
        message: `JSON 복원이 완료되었습니다. 설정 1건, 입력 ${result.importedEntryCount.toLocaleString("ko-KR")}건을 불러왔습니다.${droppedMsg}`,
      });
      setImportFile(null);
      setImportPreview(null);
      setImportPreviewError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      clearStaleErrors(() => false);
    } else if (result.outcome === "rolled-back") {
      const importMsg = result.importError?.message ?? "알 수 없는 오류";
      setImportJsonStatus({
        status: "error",
        message: `JSON 복원 중 오류가 발생했습니다 (${importMsg}). 이전 상태(설정 1건, 입력 ${result.restoredEntryCount ?? 0}건)를 복구했습니다.`,
      });
    } else {
      const importMsg = result.importError?.message ?? "알 수 없음";
      const rollbackMsg = result.rollbackError?.message ?? "알 수 없음";
      setImportJsonStatus({
        status: "error",
        message: `복원과 이전 상태 복구 모두에 실패했습니다. 새로고침 후 다시 확인해 주세요. (가져오기 오류: ${importMsg} · 롤백 오류: ${rollbackMsg})`,
      });
    }
  };

  /* -------- 렌더링 -------- */

  const canExportJson = !appLoading && settings !== null && !isBusy;
  const canImportJson = importPreview !== null && !isBusy && settings !== null;
  const canExportCsv =
    !appLoading && settings !== null && !isBusy && monthEntriesCount > 0;
  const canSeed = !appLoading && !isBusy;
  const canReset = !isBusy;

  return (
    <>
      <PageHeader
        title="백업 / 복원"
        description="브라우저(IndexedDB)에 저장된 설정과 매출 데이터를 내보내거나 되돌립니다."
      />

      {appError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {appError}
        </div>
      ) : null}

      {/* 현재 상태 요약 배지 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-accent/30 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-accent-foreground">현재 상태</span>
        <span>
          엔트리{" "}
          <span className="font-semibold text-foreground">
            {appLoading
              ? "로드 중..."
              : `${entries.length.toLocaleString("ko-KR")}건`}
          </span>
        </span>
        <span>설정 {settings ? "로드됨 ✓" : "없음"}</span>
        {isBusy ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> 작업 중
          </span>
        ) : null}
      </div>

      {/* A. 데이터 백업 / 복원 */}
      <SectionCard
        title="데이터 백업 / 복원"
        description="설정·입력·메타 정보를 JSON 한 파일로 저장하고, 동일한 형식으로 되돌립니다."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Export */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">
              JSON 내보내기
            </h4>
            <p className="text-xs text-muted-foreground">
              앱 전체 상태를 하나의 JSON 파일로 다운로드합니다.
              <br />
              복원 전에 먼저 내보내기로 백업을 만들어 두는 것을 권장합니다.
            </p>
            <ActionButton
              onClick={handleExportJson}
              disabled={!canExportJson}
              status={exportJsonStatus.status}
              icon={<Download className="h-4 w-4" />}
              label={
                exportJsonStatus.status === "working"
                  ? "내보내는 중..."
                  : "JSON 내보내기"
              }
            />
            <StatusMessage state={exportJsonStatus} />
          </div>

          {/* Import */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">
              JSON 복원
            </h4>
            <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                JSON 복원은 현재 데이터를 덮어씁니다. 복원 전에 위의 &quot;JSON
                내보내기&quot; 로 백업을 먼저 만들어 두세요.
              </span>
            </div>
            <label className="block">
              <span className="sr-only">복원할 JSON 파일 선택</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                disabled={isBusy}
                aria-label="복원할 JSON 파일 선택"
                className="block w-full text-xs text-muted-foreground file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-white file:px-3 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            {importFile ? (
              <p className="text-[11px] text-muted-foreground">
                선택된 파일:{" "}
                <span className="font-mono text-foreground">
                  {importFile.name}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                선택된 파일이 없습니다.
              </p>
            )}

            {/* 사전 검증 결과 */}
            {importPreview ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800">
                <p className="flex items-center gap-1.5 font-semibold">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  검증 결과
                </p>
                <ul className="mt-1 space-y-0.5">
                  <li>· 설정: 유효</li>
                  <li>
                    · 입력: 유효{" "}
                    <span className="font-semibold">
                      {importPreview.entries.length.toLocaleString("ko-KR")}건
                    </span>
                    {importPreview.droppedEntryCount > 0 ? (
                      <span>
                        , 제외 예정{" "}
                        <span className="font-semibold">
                          {importPreview.droppedEntryCount.toLocaleString(
                            "ko-KR",
                          )}
                          건
                        </span>
                      </span>
                    ) : null}
                  </li>
                </ul>
              </div>
            ) : null}
            {importPreviewError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive">
                <p className="font-semibold">파일 검증 실패</p>
                <p className="mt-0.5">{importPreviewError}</p>
              </div>
            ) : null}

            <ActionButton
              onClick={handleImportJson}
              disabled={!canImportJson}
              status={importJsonStatus.status}
              icon={<Upload className="h-4 w-4" />}
              label={
                importJsonStatus.status === "working"
                  ? "복원 중..."
                  : "JSON 복원 실행"
              }
            />
            <StatusMessage state={importJsonStatus} />
          </div>
        </div>
      </SectionCard>

      {/* B + C. 월 단위 작업 (CSV + 샘플) */}
      <SectionCard
        title="월 단위 작업"
        description="아래 두 기능은 선택한 월을 기준으로 동작합니다."
        actions={<MonthPicker value={month} onChange={setMonth} />}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* CSV */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">
              월별 CSV 내보내기
            </h4>
            <p className="text-xs text-muted-foreground">
              현재 선택한 월의 입력값과 계산값을 함께 내보냅니다.
              <br />
              기록된 날짜{" "}
              <span className="font-semibold text-foreground">
                {monthEntriesCount}일
              </span>
              {monthEntriesCount === 0 ? " · 내보낼 데이터가 없습니다" : null}
            </p>
            <ActionButton
              onClick={handleExportCsv}
              disabled={!canExportCsv}
              status={exportCsvStatus.status}
              icon={<Download className="h-4 w-4" />}
              label={
                exportCsvStatus.status === "working"
                  ? "생성 중..."
                  : "선택 월 CSV 다운로드"
              }
            />
            <StatusMessage state={exportCsvStatus} />
          </div>

          {/* Sample */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">
              샘플 데이터 주입
            </h4>
            <p className="text-xs text-muted-foreground">
              동일 월에 대해 반복 실행해도 같은 샘플이 다시 생성되며, 동일
              id는 덮어쓰기 됩니다.
            </p>
            <ActionButton
              onClick={handleSeed}
              disabled={!canSeed}
              status={seedStatus.status}
              icon={<Sparkles className="h-4 w-4" />}
              label={
                seedStatus.status === "working"
                  ? "주입 중..."
                  : "선택 월 샘플 데이터 넣기"
              }
            />
            <StatusMessage state={seedStatus} />
          </div>
        </div>
      </SectionCard>

      {/* D. 전체 초기화 */}
      <SectionCard
        title="전체 초기화"
        description="설정·입력 데이터·메타 정보가 모두 초기화됩니다."
      >
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">이 작업은 되돌릴 수 없습니다.</p>
            <p className="mt-0.5 text-destructive/80">
              초기화 후에는 설정이 앱 기본값으로 재생성되고, 모든 매출 입력이
              삭제됩니다. 다른 작업이 진행 중일 때는 버튼이 비활성화됩니다.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <DangerButton
            onClick={handleReset}
            disabled={!canReset}
            status={resetStatus.status}
            label={
              resetStatus.status === "working"
                ? "초기화 중..."
                : "전체 데이터 초기화"
            }
          />
          <StatusMessage state={resetStatus} />
        </div>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 재사용 UI 조각                                                       */
/* ------------------------------------------------------------------ */

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  status: ActionStatus;
  icon: ReactNode;
  label: string;
}

function ActionButton({
  onClick,
  disabled,
  status,
  icon,
  label,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors",
        "hover:bg-primary/90",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {status === "working" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

interface DangerButtonProps {
  onClick: () => void;
  disabled: boolean;
  status: ActionStatus;
  label: string;
}

function DangerButton({
  onClick,
  disabled,
  status,
  label,
}: DangerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-4 text-xs font-semibold text-destructive-foreground shadow-sm transition-colors",
        "hover:bg-destructive/90",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {status === "working" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function StatusMessage({ state }: { state: StatusState }) {
  if (state.status === "idle" || !state.message) return null;

  const toneClass =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state.status === "error"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-border bg-secondary/40 text-muted-foreground";

  const Icon =
    state.status === "success"
      ? Check
      : state.status === "error"
        ? AlertTriangle
        : Loader2;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      aria-live={state.status === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-1.5 rounded-md border px-3 py-2 text-[11px] leading-relaxed",
        toneClass,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          state.status === "working" && "animate-spin",
        )}
      />
      <span>{state.message}</span>
    </p>
  );
}
