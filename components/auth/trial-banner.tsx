import Link from "next/link";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  getTrialDaysRemaining,
  isTrialEndingSoon,
} from "@/lib/auth/access";
import type { AccessStatus, StoreRow } from "@/lib/auth/types";

interface TrialBannerProps {
  store: Pick<StoreRow, "status" | "trial_ends_at">;
  accessStatus: AccessStatus;
}

/**
 * 앱 영역 상단에 노출되는 체험/결제 상태 배너.
 * - trialing : "무료 체험 N일 남음" / 3일 이하면 강조
 * - expired  : 결제 유도 (빌링 페이지로 이동)
 * - 그 외    : 표시 안 함
 */
export function TrialBanner({ store, accessStatus }: TrialBannerProps) {
  if (accessStatus === "trialing") {
    const days = getTrialDaysRemaining(store.trial_ends_at);
    const ending = isTrialEndingSoon(store.trial_ends_at);

    return (
      <div
        role="status"
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs",
          ending
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-primary/30 bg-accent/40 text-accent-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          {ending ? (
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Clock aria-hidden="true" className="h-4 w-4" />
          )}
          <span className="font-semibold">
            {ending
              ? `무료 체험이 ${days}일 후 종료됩니다`
              : `무료 체험 ${days}일 남음`}
          </span>
          <span className="hidden text-[11px] opacity-80 sm:inline">
            · 체험 종료 후 월 29,000원 (VAT 포함 31,900원)
          </span>
        </div>
        <Link
          href="/app/billing"
          className={cn(
            "inline-flex h-8 items-center rounded-md px-3 text-[11px] font-semibold transition-colors",
            ending
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          결제 플랜 보기
        </Link>
      </div>
    );
  }

  if (accessStatus === "expired") {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert aria-hidden="true" className="h-4 w-4" />
          <span className="font-semibold">
            무료 체험이 종료되었습니다. 계속 사용하시려면 결제가 필요합니다.
          </span>
        </div>
        <Link
          href="/app/billing"
          className="inline-flex h-8 items-center rounded-md bg-destructive px-3 text-[11px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          결제로 이동
        </Link>
      </div>
    );
  }

  if (accessStatus === "past_due" || accessStatus === "cancelled") {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          <span className="font-semibold">
            {accessStatus === "past_due"
              ? "결제 실패 상태입니다. 결제 수단을 확인해 주세요."
              : "구독이 해지 예정입니다. 구독을 유지하려면 결제 설정을 확인해 주세요."}
          </span>
        </div>
        <Link
          href="/app/billing"
          className="inline-flex h-8 items-center rounded-md bg-amber-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700"
        >
          결제 페이지
        </Link>
      </div>
    );
  }

  return null;
}
