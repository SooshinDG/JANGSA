import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 공개 영역(marketing) 레이아웃.
 * 단순한 상단 헤더 + children. 인증/사이드바 없음.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              장
            </span>
            <span className="text-sm font-semibold text-foreground">
              장사 계산기
            </span>
          </Link>
          <nav
            aria-label="공개 메뉴"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
          >
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="ml-1 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              회원가입
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-[11px] text-muted-foreground md:px-8">
          <p>© 2026 장사 계산기</p>
          <p>매출·순이익·수수료 자동 계산 서비스</p>
        </div>
      </footer>
    </div>
  );
}
