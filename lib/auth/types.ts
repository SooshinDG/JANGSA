/**
 * SaaS 전환 단계에서 Supabase DB 테이블과 1:1 매핑되는 타입.
 * Dexie 기반 로컬 MVP 의 타입(`@/types`)과는 별개로 관리한다.
 */

export type AccessStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "suspended";

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
  status: AccessStatus;
  trial_started_at: string;
  trial_ends_at: string;
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

export interface SubscriptionRow {
  id: string;
  store_id: string;
  plan_code: string | null;
  status: AccessStatus;
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
  subscription: SubscriptionRow | null;
  accessStatus: AccessStatus;
}
