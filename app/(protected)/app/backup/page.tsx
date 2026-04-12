"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileCheck2,
  Loader2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { MonthPicker } from "@/components/common/month-picker";
import { useAppState } from "@/hooks/useAppState";
import { useStoreAccess } from "@/components/providers/store-access-context";
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
/* 타입                                                                */
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

/* ================================================================== */
/* 메인 페이지                                                          */
/* ================================================================== */

export default function AppBackupPage() {
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

  const { canWrite, storeId } = useStoreAccess();

  const [month, setMonth] = useState<string>(() => currentMonthKey());
  const [exportJsonStatus, setExportJsonStatus] = useState<StatusState>(IDLE);
  const [importJsonStatus, setImportJsonStatus] = useState<StatusState>(IDLE);
  const [exportCsvStatus, setExportCsvStatus] = useState<StatusState>(IDLE);
  const [seedStatus, setSeedStatus] = useState<StatusState>(IDLE);
  const [resetStatus, setResetStatus] = useState<StatusState>(IDLE);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedBackup | null>(null);
  const [importPreviewError, setImportPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const monthEntriesCount = useMemo(
    () => getEntriesForMonth(entries, month).length,
    [entries, month],
  );

  const isBusy = [exportJsonStatus, importJsonStatus, exportCsvStatus, seedStatus, resetStatus]
    .some((s) => s.status === "working");

  /* ---- JSON export ---- */
  const handleExportJson = () => {
    if (!settings) return;
    setExportJsonStatus({ status: "working" });
    try {
      const payload = buildBackupPayload(settings, entries, storeId);
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

  /* ---- 샘플 ---- */
  const handleSeed = async () => {
    if (!canWrite) return;
    setSeedStatus({ status: "working" });
    try {
      await seedSampleData(month);
      setSeedStatus({
        status: "success",
        message: `${month} 월 샘플 데이터를 주입했습니다.`,
      });
    } catch (e) {
      setSeedStatus({
        status: "error",
        message: e instanceof Error ? e.message : "샘플 주입에 실패했습니다.",
      });
    }
  };

  /* ---- 전체 초기화 ---- */
  const handleReset = async () => {
    if (!canWrite) return;
    if (!window.confirm("현재 매장 데이터를 초기화합니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?")) return;
    if (!window.confirm("마지막 확인입니다. 설정·매출 입력이 모두 삭제됩니다. 진행하시겠습니까?")) return;

    setResetStatus({ status: "working" });
    try {
      await resetAllData();
      setResetStatus({ status: "success", message: "현재 매장 데이터가 초기화되었습니다." });
      setExportJsonStatus(IDLE);
      setImportJsonStatus(IDLE);
      setExportCsvStatus(IDLE);
      setSeedStatus(IDLE);
      setImportFile(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setResetStatus({ status: "error", message: e instanceof Error ? e.message : "초기화에 실패했습니다." });
    }
  };

  /* ---- CSV export ---- */
  const handleExportCsv = () => {
    if (!settings) return;
    setExportCsvStatus({ status: "working" });
    try {
      const monthEntries = getEntriesForMonth(entries, month);
      if (monthEntries.length === 0) {
        setExportCsvStatus({ status: "error", message: `${month} 월에 저장된 데이터가 없습니다.` });
        return;
      }
      const csv = buildMonthlySettlementCsv(entries, settings, month);
      downloadCsv(buildCsvFilename(month), csv);
      setExportCsvStatus({ status: "success", message: `${buildCsvFilename(month)} 다운로드를 시작했습니다. (${monthEntries.length}일)` });
    } catch (e) {
      setExportCsvStatus({ status: "error", message: e instanceof Error ? e.message : "CSV 실패" });
    }
  };

  /* ---- JSON import: 파일 선택 즉시 검증 ---- */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImportFile(file);
    setImportPreview(null);
    setImportPreviewError(null);
    setImportJsonStatus(IDLE);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      setImportPreview(parsed);
    } catch (e) {
      setImportPreviewError(
        e instanceof BackupImportError ? e.message : e instanceof Error ? e.message : "파일 파싱 실패",
      );
    }
  };

  /* ---- JSON import: 실행 ---- */
  const handleImportJson = async () => {
    if (!importPreview || !settings || !canWrite) return;

    const storeIdMismatch =
      importPreview.sourceStoreId && importPreview.sourceStoreId !== storeId;

    const confirmMsg = storeIdMismatch
      ? "이 파일은 다른 매장에서 생성된 백업일 수 있습니다.\n현재 매장 데이터에 덮어씁니다. 계속할까요?"
      : "현재 매장 데이터를 덮어쓰고 JSON 복원을 진행할까요?";

    if (!window.confirm(confirmMsg)) return;

    const snapshot: ImportSnapshot = { settings, entries: [...entries] };
    setImportJsonStatus({ status: "working" });

    const result = await performRestoreWithRollback(importPreview, snapshot, {
      resetAllData,
      updateSettings,
      upsertEntries,
    });

    if (result.outcome === "success") {
      const droppedMsg = result.droppedEntryCount > 0 ? ` · 제외 ${result.droppedEntryCount}건` : "";
      setImportJsonStatus({
        status: "success",
        message: `복원 완료. 설정 1건, 입력 ${result.importedEntryCount}건${droppedMsg}`,
      });
      setImportFile(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (result.outcome === "rolled-back") {
      setImportJsonStatus({
        status: "error",
        message: `복원 실패 (${result.importError?.message ?? "?"}). 이전 상태를 복구했습니다.`,
      });
    } else {
      setImportJsonStatus({
        status: "error",
        message: `복원과 복구 모두 실패. 새로고침 후 확인해 주세요. (${result.importError?.message})`,
      });
    }
  };

  /* ---- 공통 조건 ---- */
  const canExportJson = !appLoading && settings !== null && !isBusy;
  const canImportJson = importPreview !== null && !isBusy && settings !== null && canWrite;
  const canExportCsv = !appLoading && settings !== null && !isBusy && monthEntriesCount > 0;
  const canSeed = !appLoading && !isBusy && canWrite;
  const canReset = !isBusy && canWrite;

  /* ---- 렌더 ---- */
  return (
    <>
      <PageHeader
        title="백업 / 복원"
        description="현재 매장의 Supabase 원본 데이터를 내보내거나 되돌립니다."
      />

      {appError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {appError}
        </div>
      ) : null}

      {!canWrite ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">현재 계정 상태에서는 데이터를 수정할 수 없습니다.</p>
            <p className="mt-0.5 text-amber-800/80">
              내보내기(export)는 가능하지만, 복원·샘플·초기화는 결제 후 이용할 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-accent/30 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-accent-foreground">현재 매장</span>
        <span>엔트리 <span className="font-semibold text-foreground">{appLoading ? "로드 중..." : `${entries.length}건`}</span></span>
        <span>설정 {settings ? "✓" : "없음"}</span>
        {isBusy ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold"><Loader2 className="h-3 w-3 animate-spin" /> 작업 중</span> : null}
      </div>

      {/* A. JSON export / import */}
      <SectionCard title="데이터 백업 / 복원" description="설정·입력을 JSON 파일로 저장하고 복원합니다.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">JSON 내보내기</h4>
            <p className="text-xs text-muted-foreground">현재 매장 전체 데이터를 하나의 JSON 파일로 저장합니다.</p>
            <ActionButton onClick={handleExportJson} disabled={!canExportJson} status={exportJsonStatus.status} icon={<Download className="h-4 w-4" />} label={exportJsonStatus.status === "working" ? "내보내는 중..." : "JSON 내보내기"} />
            <StatusMessage state={exportJsonStatus} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">JSON 복원</h4>
            {canWrite ? (
              <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>복원은 현재 매장 데이터를 덮어씁니다. 먼저 내보내기로 백업을 만드세요.</span>
              </div>
            ) : null}
            <label className="block">
              <span className="sr-only">복원할 JSON 파일 선택</span>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChange} disabled={isBusy || !canWrite} aria-label="복원할 JSON 파일 선택" className="block w-full text-xs text-muted-foreground file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-white file:px-3 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary disabled:cursor-not-allowed disabled:opacity-50" />
            </label>
            {importFile ? <p className="text-[11px] text-muted-foreground">선택: <span className="font-mono text-foreground">{importFile.name}</span></p> : null}

            {importPreview ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                <p className="flex items-center gap-1.5 font-semibold"><FileCheck2 className="h-3.5 w-3.5" /> 검증 결과</p>
                <ul className="mt-1 space-y-0.5">
                  <li>· 설정: 유효</li>
                  <li>· 입력: 유효 {importPreview.entries.length}건{importPreview.droppedEntryCount > 0 ? `, 제외 예정 ${importPreview.droppedEntryCount}건` : ""}</li>
                  {importPreview.sourceStoreId && importPreview.sourceStoreId !== storeId ? (
                    <li className="text-amber-700">· 다른 매장에서 생성된 백업입니다. 현재 매장에 복원됩니다.</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            {importPreviewError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                <p className="font-semibold">파일 검증 실패</p>
                <p className="mt-0.5">{importPreviewError}</p>
              </div>
            ) : null}

            <ActionButton onClick={handleImportJson} disabled={!canImportJson} status={importJsonStatus.status} icon={<Upload className="h-4 w-4" />} label={importJsonStatus.status === "working" ? "복원 중..." : "JSON 복원 실행"} />
            <StatusMessage state={importJsonStatus} />
          </div>
        </div>
      </SectionCard>

      {/* B+C. 월 단위 작업 */}
      <SectionCard title="월 단위 작업" description="선택한 월 기준으로 동작합니다." actions={<MonthPicker value={month} onChange={setMonth} />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">월별 CSV 내보내기</h4>
            <p className="text-xs text-muted-foreground">기록된 날짜 <span className="font-semibold text-foreground">{monthEntriesCount}일</span>{monthEntriesCount === 0 ? " · 내보낼 데이터 없음" : ""}</p>
            <ActionButton onClick={handleExportCsv} disabled={!canExportCsv} status={exportCsvStatus.status} icon={<Download className="h-4 w-4" />} label={exportCsvStatus.status === "working" ? "생성 중..." : "CSV 다운로드"} />
            <StatusMessage state={exportCsvStatus} />
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">샘플 데이터 주입</h4>
            <p className="text-xs text-muted-foreground">동일 날짜는 덮어쓰기 됩니다.</p>
            <ActionButton onClick={handleSeed} disabled={!canSeed} status={seedStatus.status} icon={<Sparkles className="h-4 w-4" />} label={seedStatus.status === "working" ? "주입 중..." : "샘플 넣기"} />
            <StatusMessage state={seedStatus} />
          </div>
        </div>
      </SectionCard>

      {/* D. 전체 초기화 */}
      <SectionCard title="현재 매장 초기화" description="설정과 입력 데이터가 모두 삭제됩니다.">
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">이 작업은 되돌릴 수 없습니다.</p>
            <p className="mt-0.5 text-destructive/80">현재 매장의 설정과 매출 입력이 모두 삭제됩니다.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <DangerButton onClick={handleReset} disabled={!canReset} status={resetStatus.status} label={resetStatus.status === "working" ? "초기화 중..." : "현재 매장 초기화"} />
          <StatusMessage state={resetStatus} />
        </div>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 재사용 UI 조각                                                       */
/* ------------------------------------------------------------------ */

function ActionButton({ onClick, disabled, status, icon, label }: { onClick: () => void; disabled: boolean; status: ActionStatus; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50")}>
      {status === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function DangerButton({ onClick, disabled, status, label }: { onClick: () => void; disabled: boolean; status: ActionStatus; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-4 text-xs font-semibold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50")}>
      {status === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {label}
    </button>
  );
}

function StatusMessage({ state }: { state: StatusState }) {
  if (state.status === "idle" || !state.message) return null;
  const toneClass = state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : state.status === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-secondary/40 text-muted-foreground";
  const Icon = state.status === "success" ? Check : state.status === "error" ? AlertTriangle : Loader2;
  return (
    <p role={state.status === "error" ? "alert" : "status"} aria-live={state.status === "error" ? "assertive" : "polite"} className={cn("flex items-start gap-1.5 rounded-md border px-3 py-2 text-[11px] leading-relaxed", toneClass)}>
      <Icon aria-hidden="true" className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", state.status === "working" && "animate-spin")} />
      <span>{state.message}</span>
    </p>
  );
}
