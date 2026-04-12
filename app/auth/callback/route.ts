import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Auth 의 이메일 확인 / 매직링크 / OAuth 콜백을 처리한다.
 *
 * 현재 단계에서는 이메일 + 비밀번호 로그인이 기본이지만,
 * "Confirm email" 옵션이 켜진 프로젝트에서는 가입 확인 메일을 통해
 * 이 경로로 돌아온다. 세션 교환 후 /app/dashboard 로 이동.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/dashboard";

  if (code) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
