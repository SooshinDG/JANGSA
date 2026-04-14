import type { AccessStatus } from "./types";

/**
 * 서버/클라이언트 공용 access 판별 유틸 (순수 함수).
 *
 * 무료 서비스 전환 후: 로그인한 사용자는 항상 접근·쓰기 가능.
 * 과금 관련 상태(trialing/active/past_due/expired 등)는 제거됨.
 */

/** 항상 "free" 반환 — 무료 서비스로 전환 */
export function getAccessStatusFromStore(): AccessStatus {
  return "free";
}

/** 항상 true — 로그인 사용자는 항상 앱 접근 가능 */
export function isAccessAllowed(_status: AccessStatus): boolean {
  return true;
}

/** 항상 true — 로그인 사용자는 항상 데이터 쓰기 가능 */
export function isWriteAllowed(_status: AccessStatus): boolean {
  return true;
}
