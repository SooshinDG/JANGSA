"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import type { AccessStatus } from "@/lib/auth/types";
import { cn } from "@/lib/utils/cn";

interface BillingCTAProps {
  accessStatus: AccessStatus;
  trialDays: number;
}

const CTA_LABELS: Partial<Record<AccessStatus, string>> = {
  trialing: "지금 구독 시작하기",
  expired: "구독 시작하기",
  past_due: "결제 수단 변경하기",
  cancelled: "다시 구독하기",
};

/**
 * 결제 CTA 버튼 (클라이언트 컴포넌트).
 *
 * - checkout API 를 호출해 Stripe Checkout URL 을 받은 뒤 redirect 한다.
 * - success=true 쿼리 파라미터가 있으면 결제 성공 메시지를 표시하고 router.refresh() 한다.
 */
export function BillingCTA({ accessStatus, trialDays }: BillingCTAProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";

  // 결제 성공 후 서버 상태를 갱신하고 쿼리를 정리한다
  useEffect(() => {
    if (isSuccess) {
      router.refresh();
      // 약간의 딜레이 후 clean URL 으로 교체 (성공 메시지는 먼저 보여줌)
      const timer = setTimeout(() => {
        router.replace("/app/billing");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "결제 페이지를 준비하지 못했습니다.");
        return;
      }
      // Stripe Checkout 으로 redirect
      window.location.href = data.url;
    } catch {
      setError("결제 페이지를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel = CTA_LABELS[accessStatus] ?? "구독 시작하기";

  return (
    <div className="flex flex-col gap-3">
      {isSuccess ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          <span className="font-semibold">
            결제가 완료되었습니다. 잠시 후 구독 상태가 반영됩니다.
          </span>
        </div>
      ) : null}

      {isCanceled ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <span className="font-semibold">
            결제가 취소되었습니다. 언제든 다시 시작할 수 있습니다.
          </span>
        </div>
      ) : null}

      {accessStatus === "trialing" && trialDays > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          무료 체험이 {trialDays}일 남아 있습니다. 지금 구독하시면 체험 종료 후에도
          끊김 없이 사용할 수 있습니다.
        </p>
      ) : null}

      {accessStatus === "expired" ? (
        <p className="text-[11px] text-destructive">
          무료 체험이 종료되었습니다. 계속 사용하시려면 구독을 시작해 주세요.
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || isSuccess}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold shadow-sm transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {loading ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" className="h-4 w-4" />
        )}
        {loading ? "결제 페이지 준비 중..." : ctaLabel}
      </button>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
