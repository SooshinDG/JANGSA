"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, LogIn, RefreshCcw } from "lucide-react";

/**
 * 보호 영역(`/app/*`) 레이아웃/페이지에서 예외가 발생했을 때 사용자에게
 * 흰 화면 대신 진단 가능한 오류 화면을 보여준다.
 *
 * - Next.js 14 App Router 에서 error boundary 는 반드시 client component.
 * - redirect() 로 인한 `NEXT_REDIRECT` 는 여기서 잡히지 않고 정상 네비게이션으로 처리된다.
 *   (requireStoreContext 의 redirect 는 이 컴포넌트를 통과하지 않는다)
 */
export default function ProtectedAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 로그에도 남고 브라우저 콘솔에도 뜬다.
    console.error("[protected app error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          앱을 불러오는 중 오류가 발생했습니다
        </h1>
        <p className="text-xs text-muted-foreground">
          잠시 후 다시 시도하거나, 로그인 화면으로 돌아가 주세요.
        </p>
      </div>

      <pre className="max-h-48 w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-[11px] leading-relaxed text-destructive">
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          <RefreshCcw aria-hidden="true" className="h-3.5 w-3.5" />
          다시 시도
        </button>
        <Link
          href="/login"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
          로그인 화면으로
        </Link>
      </div>
    </div>
  );
}
