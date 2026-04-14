/**
 * SaaS 전환 단계에서 Supabase DB 테이블과 1:1 매핑되는 타입.
 * Dexie 기반 로컬 MVP 의 타입(`@/types`)과는 별개로 관리한다.
 *
 * 과금 제거 후 무료 서비스로 전환: AccessStatus = "free" 단일 값.
 */

/** 무료 서비스 전환 후 단일 접근 상태 */
export type AccessStatus = "free";

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreRow {
  id: string;
  owner_user_id: string;
  store_name: string | null;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreMembershipRow {
  id: string;
  store_id: string;
  user_id: string;
  role: "owner" | "manager" | "staff";
  created_at: string;
}

/**
 * DB 호환용 — 기존 subscriptions 테이블 행 타입.
 * 앱 로직에서는 더 이상 사용하지 않지만 마이그레이션 기간 동안 유지.
 */
export interface SubscriptionRow {
  id: string;
  store_id: string;
  plan_code: string | null;
  status: string;
  billing_provider: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 앱 영역 레이아웃에서 매번 필요한 컨텍스트 묶음.
 */
export interface StoreContext {
  userId: string;
  email: string | null;
  store: StoreRow;
  membership: StoreMembershipRow;
  accessStatus: AccessStatus;
}
