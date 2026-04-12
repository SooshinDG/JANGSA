import Link from "next/link";
import { AlertTriangle, LogOut, RefreshCcw } from "lucide-react";

export const metadata = {
  title: "앱 계정 초기화 실패 | 장사 계산기",
};

interface AccountSetupErrorPageProps {
  searchParams?: { reason?: string };
}

/**
 * 보호 영역 진입 시 store context 를 만들지 못한 사용자를 위한 공개 에러 페이지.
 *
 * 왜 `/login` 으로 보내지 않는가:
 * - middleware 가 로그인된 사용자를 `/login` 에서 `/app/dashboard` 로 되돌려 보내므로
 *   `/login?error=...` fallback 은 곧바로 리다이렉트 루프를 만든다.
 * - 이 페이지는 **marketing route group** 에 있어서 middleware 의 리다이렉트 규칙
 *   어디에도 걸리지 않는다. 로그인/비로그인 모두 자유롭게 접근 가능.
 *
 * 사용자가 할 수 있는 행동:
 * - "다시 시도" → `/app/dashboard` 로 복귀 (bootstrap 재실행 기회)
 * - "로그인으로 이동" → `/login`
 * - "홈으로" → `/`
 * - "로그아웃" → `/auth/signout` POST
 */
export default function AccountSetupErrorPage({
  searchParams,
}: AccountSetupErrorPageProps) {
  const reason = searchParams?.reason;

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center md:px-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="h-6 w-6" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          앱 계정 초기화 실패
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          로그인은 성공했지만, 매장 데이터 연결에 실패했습니다.
          <br />
          잠시 후 다시 시도하거나 로그아웃 후 다시 로그인해 주세요.
          <br />
          문제가 계속되면 관리자에게 문의해 주세요.
        </p>
      </div>

      {reason ? (
        <p className="max-w-full break-words rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-[11px] text-muted-foreground">
          <span className="font-semibold">reason:</span> {reason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/app/dashboard"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <RefreshCcw aria-hidden="true" className="h-3.5 w-3.5" />
          다시 시도
        </Link>
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          로그인으로 이동
        </Link>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          홈으로
        </Link>
      </div>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          <LogOut aria-hidden="true" className="h-3 w-3" />
          로그아웃
        </button>
      </form>
    </section>
  );
}
