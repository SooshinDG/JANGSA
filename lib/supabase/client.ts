"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 컴포넌트에서 사용하는 Supabase 클라이언트.
 * 쿠키 기반 세션을 공유하므로 서버/미들웨어와 동일한 세션을 본다.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
