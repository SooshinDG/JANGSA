"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDot,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { SettingsNumberField } from "./settings-number-field";
import { CHANNELS } from "@/lib/constants/channels";
import { useSettings } from "@/hooks/useSettings";
import { useStoreAccess } from "@/components/providers/store-access-context";
import { buildDefaultSettings } from "@/lib/utils/default-state";
import { cn } from "@/lib/utils/cn";
import type {
  AppSettings,
  ChannelKey,
  ChannelSettings,
  CostSettings,
  FixedCosts,
  GoalSettings,
} from "@/types";

/* ------------------------------------------------------------------ */
/* 타입                                                                */
/* ------------------------------------------------------------------ */

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ChannelDraft {
  label: string;
  enabled: boolean;
  feeRate: string;
}

interface SettingsDraft {
  channels: Record<ChannelKey, ChannelDraft>;
  costRules: { ingredientCostRate: string; packagingCostRate: string };
  goalSettings: { salesTarget: string };
  fixedCosts: {
    rent: string;
    labor: string;
    utilities: string;
    marketing: string;
    misc: string;
  };
}

interface SettingsPatch {
  channels: Record<ChannelKey, ChannelSettings>;
  costRules: CostSettings;
  goalSettings: GoalSettings;
  fixedCosts: FixedCosts;
}

const CHANNEL_KEY_ORDER: ChannelKey[] = ["baemin", "yogiyo", "coupang", "pos"];

const FIXED_COST_FIELDS: ReadonlyArray<{
  key: keyof FixedCosts;
  label: string;
  helperText?: string;
}> = [
  { key: "rent", label: "임대료" },
  { key: "labor", label: "인건비" },
  { key: "utilities", label: "공과금" },
  { key: "marketing", label: "마케팅 고정비" },
  { key: "misc", label: "기타 고정비" },
];

/* ------------------------------------------------------------------ */
/* 변환 / 정규화 유틸                                                   */
/* ------------------------------------------------------------------ */

function numberToDraftString(value: number): string {
  if (!Number.isFinite(value)) return "0";
  // 정수면 그대로, 소수면 불필요한 0 제거
  return Number.isInteger(value) ? String(value) : String(value);
}

function parseDraftNumber(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function clampPercent(raw: string): number {
  const n = parseDraftNumber(raw);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function clampKRW(raw: string): number {
  const n = parseDraftNumber(raw);
  if (n < 0) return 0;
  return Math.round(n);
}

type DraftSource = Pick<
  AppSettings,
  "channels" | "costRules" | "goalSettings" | "fixedCosts"
>;

function toDraft(source: DraftSource): SettingsDraft {
  const channels = {} as Record<ChannelKey, ChannelDraft>;
  for (const key of CHANNEL_KEY_ORDER) {
    const cs = source.channels[key];
    channels[key] = {
      label: cs.label,
      enabled: cs.enabled,
      feeRate: numberToDraftString(cs.feeRate),
    };
  }
  return {
    channels,
    costRules: {
      ingredientCostRate: numberToDraftString(source.costRules.ingredientCostRate),
      packagingCostRate: numberToDraftString(source.costRules.packagingCostRate),
    },
    goalSettings: {
      salesTarget: numberToDraftString(source.goalSettings.salesTarget),
    },
    fixedCosts: {
      rent: numberToDraftString(source.fixedCosts.rent),
      labor: numberToDraftString(source.fixedCosts.labor),
      utilities: numberToDraftString(source.fixedCosts.utilities),
      marketing: numberToDraftString(source.fixedCosts.marketing),
      misc: numberToDraftString(source.fixedCosts.misc),
    },
  };
}

function normalizeDraftToPatch(draft: SettingsDraft): SettingsPatch {
  const channels = {} as Record<ChannelKey, ChannelSettings>;
  for (const key of CHANNEL_KEY_ORDER) {
    const cs = draft.channels[key];
    channels[key] = {
      label: cs.label,
      enabled: cs.enabled,
      feeRate: clampPercent(cs.feeRate),
    };
  }
  return {
    channels,
    costRules: {
      ingredientCostRate: clampPercent(draft.costRules.ingredientCostRate),
      packagingCostRate: clampPercent(draft.costRules.packagingCostRate),
    },
    goalSettings: {
      salesTarget: clampKRW(draft.goalSettings.salesTarget),
    },
    fixedCosts: {
      rent: clampKRW(draft.fixedCosts.rent),
      labor: clampKRW(draft.fixedCosts.labor),
      utilities: clampKRW(draft.fixedCosts.utilities),
      marketing: clampKRW(draft.fixedCosts.marketing),
      misc: clampKRW(draft.fixedCosts.misc),
    },
  };
}

function pickPatch(settings: AppSettings): SettingsPatch {
  return {
    channels: settings.channels,
    costRules: settings.costRules,
    goalSettings: settings.goalSettings,
    fixedCosts: settings.fixedCosts,
  };
}

function isSamePatch(a: SettingsPatch, b: SettingsPatch): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ------------------------------------------------------------------ */
/* 메인 폼                                                              */
/* ------------------------------------------------------------------ */

export function SettingsForm() {
  const { settings, loading, error, updateSettings } = useSettings();

  // StoreAccessContext 가 없으면 (legacy 경로 등) canWrite=true 로 fallback
  let canWrite = true;
  try {
    const access = useStoreAccess();
    canWrite = access.canWrite;
  } catch {
    // legacy 경로에서는 StoreAccessProvider 가 없으므로 무시
  }

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  /**
   * draft 가 마지막으로 동기화된 기준 settings 스냅샷.
   * - isDirty 는 draft vs baseline 으로 판정 (외부 변경과 직접 편집을 구분하기 위함)
   * - baseline 과 실제 `settings` 가 다르면 "외부 변경" 상태
   */
  const [baseline, setBaseline] = useState<AppSettings | null>(null);
  const [externalChange, setExternalChange] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);

  // 언마운트 시 "저장됨" 타이머 정리
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const isDirty = useMemo(() => {
    if (!baseline || !draft) return false;
    return !isSamePatch(normalizeDraftToPatch(draft), pickPatch(baseline));
  }, [draft, baseline]);

  /**
   * settings 로드 / 외부 변경 감지.
   * - 최초 로드: draft 와 baseline 을 현재 settings 로 초기화
   * - 이후 settings 가 baseline 과 달라지면 = 외부 변경
   *   · 사용자가 편집 중이 아니면 (not dirty) 조용히 동기화
   *   · 편집 중이면 덮어쓰지 않고 `externalChange=true` 로만 표시
   */
  useEffect(() => {
    if (!settings) return;

    // 최초 로드
    if (!draft || !baseline) {
      setDraft(toDraft(settings));
      setBaseline(settings);
      setExternalChange(false);
      return;
    }

    // 이미 초기화됨: baseline 과 settings 차이 확인
    if (isSamePatch(pickPatch(settings), pickPatch(baseline))) return;

    if (!isDirty) {
      // 사용자가 편집 중이 아니면 조용히 새로운 settings 로 동기화
      setDraft(toDraft(settings));
      setBaseline(settings);
      setExternalChange(false);
    } else {
      // 편집 중이면 draft 를 보존하고 배너로만 알린다
      setExternalChange(true);
    }
  }, [settings, draft, baseline, isDirty]);

  const isSaving = saveStatus === "saving";

  /* -------- 입력 핸들러 -------- */

  const setChannelFee = useCallback((key: ChannelKey, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        channels: {
          ...prev.channels,
          [key]: { ...prev.channels[key], feeRate: value },
        },
      };
    });
    setSaveStatus("idle");
  }, []);

  const setCostRule = useCallback(
    (key: keyof CostSettings, value: string) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          costRules: { ...prev.costRules, [key]: value },
        };
      });
      setSaveStatus("idle");
    },
    [],
  );

  const setGoal = useCallback((value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, goalSettings: { salesTarget: value } };
    });
    setSaveStatus("idle");
  }, []);

  const setFixedCost = useCallback(
    (key: keyof FixedCosts, value: string) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fixedCosts: { ...prev.fixedCosts, [key]: value },
        };
      });
      setSaveStatus("idle");
    },
    [],
  );

  /* -------- 액션 핸들러 -------- */

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaveStatus("saving");
    setSaveError(null);

    const patch = normalizeDraftToPatch(draft);

    try {
      await updateSettings(patch);
      // 저장 성공:
      // - 정규화된 patch 로 draft 동기화 → 사용자가 본 화면이 정확한 저장값이 됨
      // - baseline 도 patch 기반 AppSettings 로 덮음 → isDirty=false, externalChange=false
      // (Provider 의 normalizeSettings 가 동일 값에 멱등이므로 실제 settings 와 일치)
      const synced: AppSettings = {
        ...(settings ?? buildDefaultSettings()),
        ...patch,
      };
      setDraft(toDraft(synced));
      setBaseline(synced);
      setExternalChange(false);
      setSaveStatus("saved");
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus("idle");
        savedTimeoutRef.current = null;
      }, 2000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setSaveError(message);
      setSaveStatus("error");
    }
  }, [draft, settings, updateSettings]);

  /** 현재 저장된 settings 값으로 draft 를 되돌림 (외부 변경 반영 포함) */
  const handleRevert = useCallback(() => {
    if (!settings) return;
    setDraft(toDraft(settings));
    setBaseline(settings);
    setExternalChange(false);
    setSaveStatus("idle");
    setSaveError(null);
  }, [settings]);

  /**
   * 외부에서 settings 가 바뀌어 externalChange=true 가 된 상태에서
   * 사용자가 "최신 저장값 불러오기" 를 선택한 경우.
   * 실제 동작은 revert 와 동일하다.
   */
  const handleAcceptExternal = handleRevert;

  const handleLoadDefaults = useCallback(() => {
    // 기본값은 즉시 저장되지 않고 draft 로만 반영된다.
    // baseline 은 현재 settings 로 유지하여 isDirty=true 가 되도록 둔다.
    setDraft(toDraft(buildDefaultSettings()));
    setSaveStatus("idle");
    setSaveError(null);
  }, []);

  /* -------- 렌더링 -------- */

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (loading || !draft) {
    return (
      <SectionCard>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          설정 로드 중...
        </div>
      </SectionCard>
    );
  }

  const formDisabled = isSaving || !canWrite;

  return (
    <>
      {!canWrite ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">현재 계정 상태에서는 설정을 저장할 수 없습니다.</p>
            <p className="mt-0.5 text-amber-800/80">
              결제를 진행하시면 다시 수정할 수 있습니다. 현재 값은 그대로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}

      {externalChange ? (
        <ExternalChangeBanner
          dirty={isDirty}
          onAccept={handleAcceptExternal}
        />
      ) : null}

      <SectionCard
        title="채널 수수료"
        description="각 채널의 수수료율(%)을 입력하면 매출 입력·대시보드·월별 정산 계산에 즉시 반영됩니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map((channel) => {
            const cd = draft.channels[channel.id];
            return (
              <SettingsNumberField
                key={channel.id}
                label={cd.label}
                value={cd.feeRate}
                onChange={(v) => setChannelFee(channel.id, v)}
                unit="percent"
                helperText={channel.description}
                disabled={formDisabled}
              />
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="원가 · 포장비율"
          description="순매출 기준으로 원가와 포장비를 계산합니다."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsNumberField
              label="식자재 원가율"
              value={draft.costRules.ingredientCostRate}
              onChange={(v) => setCostRule("ingredientCostRate", v)}
              unit="percent"
              helperText="순매출 × 원가율 = 식자재 원가"
              disabled={formDisabled}
            />
            <SettingsNumberField
              label="포장비율"
              value={draft.costRules.packagingCostRate}
              onChange={(v) => setCostRule("packagingCostRate", v)}
              unit="percent"
              helperText="순매출 × 포장비율 = 포장비"
              disabled={formDisabled}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="목표 매출"
          description="월 목표 매출은 대시보드의 목표 달성률 계산에 사용됩니다."
        >
          <SettingsNumberField
            label="월 목표 매출"
            value={draft.goalSettings.salesTarget}
            onChange={setGoal}
            unit="krw"
            helperText="원 단위. 총매출 ÷ 목표 × 100 = 달성률"
            disabled={formDisabled}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="월 고정비"
        description="월 고정비는 최종 순이익과 손익분기점(BEP) 계산에 사용됩니다."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIXED_COST_FIELDS.map((field) => (
            <SettingsNumberField
              key={field.key}
              label={field.label}
              value={draft.fixedCosts[field.key]}
              onChange={(v) => setFixedCost(field.key, v)}
              unit="krw"
              helperText={field.helperText}
              disabled={formDisabled}
            />
          ))}
        </div>
      </SectionCard>

      <ActionBar
        isDirty={isDirty}
        saveStatus={saveStatus}
        saveError={saveError}
        isSaving={isSaving}
        canWrite={canWrite}
        onSave={handleSave}
        onRevert={handleRevert}
        onLoadDefaults={handleLoadDefaults}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 액션 바                                                              */
/* ------------------------------------------------------------------ */

interface ActionBarProps {
  isDirty: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  isSaving: boolean;
  canWrite: boolean;
  onSave: () => void;
  onRevert: () => void;
  onLoadDefaults: () => void;
}

function ActionBar({
  isDirty,
  saveStatus,
  saveError,
  isSaving,
  canWrite,
  onSave,
  onRevert,
  onLoadDefaults,
}: ActionBarProps) {
  const formDisabled = isSaving || !canWrite;
  const saveLabel =
    saveStatus === "saving"
      ? "저장 중..."
      : saveStatus === "saved"
        ? "저장됨"
        : saveStatus === "error"
          ? "다시 저장"
          : "저장하기";

  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <StatusBadge
        isDirty={isDirty}
        saveStatus={saveStatus}
        saveError={saveError}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onLoadDefaults}
          disabled={formDisabled}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-medium text-muted-foreground transition-colors",
            "hover:bg-secondary hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          기본값 불러오기
        </button>
        <button
          type="button"
          onClick={onRevert}
          disabled={formDisabled || !isDirty}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-medium text-muted-foreground transition-colors",
            "hover:bg-secondary hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          되돌리기
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={formDisabled || !isDirty}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors",
            "hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  isDirty: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
}

interface ExternalChangeBannerProps {
  dirty: boolean;
  onAccept: () => void;
}

function ExternalChangeBanner({ dirty, onAccept }: ExternalChangeBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
        />
        <div>
          <p className="font-semibold">
            저장된 설정이 외부에서 변경되었습니다.
          </p>
          <p className="mt-0.5 text-amber-800/80">
            {dirty
              ? "편집 중인 값과 다른 값이 감지되었습니다. 현재 편집 내용을 유지할지, 최신 저장값을 불러올지 선택하세요."
              : "최신 저장값을 반영하려면 아래 버튼을 눌러주세요."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAccept}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-800 shadow-sm transition-colors",
          "hover:bg-amber-100",
        )}
      >
        <RefreshCcw aria-hidden="true" className="h-3.5 w-3.5" />
        최신 저장값 불러오기
      </button>
    </div>
  );
}

function StatusBadge({ isDirty, saveStatus, saveError }: StatusBadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
  const liveProps = {
    role: saveStatus === "error" ? "alert" : "status",
    "aria-live": saveStatus === "error" ? "assertive" : ("polite" as const),
  } as const;

  if (saveStatus === "saving") {
    return (
      <span {...liveProps} className={cn(base, "bg-secondary text-muted-foreground")}>
        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        저장 중...
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <span
        {...liveProps}
        className={cn(base, "bg-destructive/10 text-destructive")}
        title={saveError ?? undefined}
      >
        <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
        저장 실패
      </span>
    );
  }

  if (saveStatus === "saved") {
    return (
      <span {...liveProps} className={cn(base, "bg-emerald-50 text-emerald-700")}>
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
        저장되었습니다
      </span>
    );
  }

  if (isDirty) {
    return (
      <span {...liveProps} className={cn(base, "bg-amber-50 text-amber-700")}>
        <CircleDot aria-hidden="true" className="h-3.5 w-3.5" />
        저장되지 않은 변경사항 있음
      </span>
    );
  }

  return (
    <span {...liveProps} className={cn(base, "bg-secondary text-muted-foreground")}>
      <Check aria-hidden="true" className="h-3.5 w-3.5" />
      모든 변경사항 저장됨
    </span>
  );
}
