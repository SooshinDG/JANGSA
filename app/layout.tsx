import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "장사 계산기 | 매출·순이익·수수료 자동 계산",
  description:
    "배민/요기요/쿠팡이츠/POS 매출을 입력하고 월별 정산과 KPI를 한눈에 확인하는 SaaS 정산 도구",
};

/**
 * 루트 레이아웃은 최소 HTML 쉘만 담당한다.
 * AppShell / AppStateProvider / 네비게이션은 아래 route group 레이아웃에서 구성:
 *
 * - app/(marketing)/layout.tsx     — 공개 영역 (랜딩 / 로그인 / 회원가입 / 요금제)
 * - app/(legacy)/layout.tsx        — 로컬 Dexie 기반 구버전 경로 (점진적 이관 중)
 * - app/(protected)/app/layout.tsx — Supabase 인증 기반 신규 /app 영역
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
