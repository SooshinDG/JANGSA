import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIX = "/app";
const AUTH_PAGES = new Set(["/login", "/signup"]);

/**
 * 로그인 여부와 무관하게 **절대 리다이렉트 대상이 되지 않는** 공개 경로.
 *
 * `/account-setup-error` 는 보호 레이아웃의 `requireStoreContext` 가 실패할 때
 * 사용자가 빠져나오는 안전 경로다. 이 경로에서 middleware 가 /app/dashboard 로
 * 되돌리면 무한 루프가 생기므로, 모든 redirect 규칙을 건너뛰도록 고정한다.
 */
const PUBLIC_ALWAYS_OK = new Set<string>(["/account-setup-error"]);

/**
 * 전역 미들웨어.
 *
 * 1. 모든 요청에 대해 Supabase 세션 쿠키를 refresh 한다.
 * 2. /app/* 는 로그인 필수. 비로그인 시 /login 으로 redirect.
 * 3. /login, /signup 접근 시 이미 로그인되어 있으면 /app/dashboard 로 redirect.
 *    단 PUBLIC_ALWAYS_OK 에 포함된 경로는 건너뛴다.
 *
 * 정적 자산 / _next / api / favicon 등은 아래 matcher 에서 제외한다.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // (0) 항상 통과시키는 공개 경로 — redirect 루프 방지용
  if (PUBLIC_ALWAYS_OK.has(pathname)) {
    return response;
  }

  // (1) 보호 경로 가드
  if (
    pathname === PROTECTED_PREFIX ||
    pathname.startsWith(`${PROTECTED_PREFIX}/`)
  ) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // (2) 인증 페이지는 이미 로그인한 사용자에게 보여주지 않는다
  if (AUTH_PAGES.has(pathname) && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에 미들웨어 적용:
     * - _next/static (정적 파일)
     * - _next/image
     * - favicon / robots / sitemap
     * - public asset 확장자
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
