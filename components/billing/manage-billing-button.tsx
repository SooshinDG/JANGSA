"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Stripe Customer Portal 로 이동하는 버튼.
 * active / past_due / cancelled 상태에서 노출된다.
 */
export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "결제 관리 페이지를 준비하지 못했습니다.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("결제 관리 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-4 text-xs font-semibold text-foreground shadow-sm transition-colors",
          "hover:bg-secondary",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {loading ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" className="h-4 w-4" />
        )}
        {loading ? "준비 중..." : "결제 관리"}
      </button>
      {error ? (
        <p role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
