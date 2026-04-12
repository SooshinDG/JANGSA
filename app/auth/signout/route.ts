import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 로그아웃 route handler.
 * 사용자 메뉴의 form[action="/auth/signout"] POST 에서 호출된다.
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/login`, {
    status: 303, // POST → GET 리다이렉트
  });
}
