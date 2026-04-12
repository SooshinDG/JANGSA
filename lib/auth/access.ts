import type { AccessStatus, StoreRow } from "./types";

/**
 * 서버/클라이언트 공용 access 판별 유틸 (순수 함수).
 *
 * 상태 규약:
 * - trialing  : 체험 기간. 앱 접근 O, 쓰기 O
 * - active    : 결제 진행 중. 앱 접근 O, 쓰기 O
 * - past_due  : 결제 실패 직후. 앱 접근 O, 쓰기 X (읽기만)
 * - cancelled : 사용자가 해지. 현재 주기 끝날 때까지는 active 처럼 취급할 수도 있음.
 *               이번 단계에서는 보수적으로 읽기 O, 쓰기 X.
 * - expired   : 체험/구독 만료. 앱 접근 X (빌링으로 유도)
 * - suspended : 관리자 정지. 앱 접근 X
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

/**
 * stores 레코드에서 "지금 시점" 의 access status 를 파생한다.
 * trial_ends_at 이 지났고 status 가 아직 trialing 이면 expired 로 승격한다.
 */
export function getAccessStatusFromStore(
  store: Pick<StoreRow, "status" | "trial_ends_at">,
  now: Date = new Date(),
): AccessStatus {
  const stored = store.status;

  if (stored === "trialing") {
    const trialEnd = toDateSafe(store.trial_ends_at);
    if (trialEnd && trialEnd.getTime() <= now.getTime()) {
      return "expired";
    }
    return "trialing";
  }

  return stored;
}

/** 앱 영역(읽기/쓰기 구분 없이) 자체에 접근 가능한지 */
export function isAccessAllowed(status: AccessStatus): boolean {
  return (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "cancelled"
  );
}

/** 데이터 쓰기 (매출 입력, 설정 저장 등) 가 허용되는지 */
export function isWriteAllowed(status: AccessStatus): boolean {
  return status === "trialing" || status === "active";
}

/**
 * 체험 종료일까지 남은 일수 (올림 계산).
 * 이미 지났으면 0, 값이 없으면 0.
 */
export function getTrialDaysRemaining(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number {
  const end = toDateSafe(trialEndsAt);
  if (!end) return 0;
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / DAY_MS);
}

/** 체험이 3일 이내로 끝날 예정인지 */
export function isTrialEndingSoon(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const remaining = getTrialDaysRemaining(trialEndsAt, now);
  return remaining > 0 && remaining <= 3;
}
