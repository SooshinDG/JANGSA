"use client";

import { useAppState } from "@/hooks/useAppState";

/**
 * Unit 02 한정 개발용 뱃지.
 * 현재 로드된 설정/엔트리 수를 간단히 확인한다.
 * 실제 백업/복원 UI는 이후 단계에서 구현.
 */
export function EntriesDebugBadge() {
  const { loading, error, entries, settings } = useAppState();

  const statusText = error
    ? error
    : loading
      ? "로컬 저장소 로드 중..."
      : `현재 엔트리 수: ${entries.length.toLocaleString("ko-KR")}개`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-accent/30 px-4 py-3 text-xs text-muted-foreground">
      <span className="font-medium text-accent-foreground">DEBUG</span>
      <span>{statusText}</span>
      <span className="text-muted-foreground/70">
        설정 로드됨: {settings ? "✓" : "—"}
      </span>
    </div>
  );
}
