import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIX = "/app";
const AUTH_PAGES = new Set(["/login", "/signup"]);

/**
 * 로그인 여부와 무관하게 **절대 리다이렉트 대상이 되지 않는** 공개 경로.
 */
const PUBLIC_ALWAYS_OK = new Set<string>(["/account-setup-error"]);

/**
 * 전역 미들웨어.
 *
 * 1. /api/* 는 즉시 통과시킨다 (Stripe webhook 등 외부 서비스 호출을 방해하지 않기 위함).
 * 2. 나머지 요청에 대해 Supabase 세션 쿠키를 refresh 한다.
 * 3. /app/* 는 로그인 필수. 비로그인 시 /login 으로 redirect.
 * 4. /login, /signup 접근 시 이미 로그인되어 있으면 /app/dashboard 로 redirect.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // (−1) API route 는 절대 middleware 로직을 타지 않는다.
  //      Stripe webhook 처럼 외부 서비스가 POST 하는 경로에서
  //      updateSession 의 쿠키 조작이나 redirect 가 308 을 유발할 수 있다.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

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
     * - api (API route handler — Stripe webhook 등 외부 호출 보호)
     * - _next/static (정적 파일)
     * - _next/image
     * - favicon / robots / sitemap
     * - public asset 확장자
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
