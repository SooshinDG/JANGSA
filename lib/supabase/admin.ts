import { createClient } from "@supabase/supabase-js";

/**
 * Service Role Key 기반 서버 전용 Supabase 클라이언트.
 *
 * ⚠️ 브라우저 / Edge Runtime 에 노출되면 절대 안 되며,
 *    Node.js 서버 런타임(server action, route handler)에서만 사용한다.
 *
 * 주 사용처: 회원가입 직후 profile/store/membership/subscription 부트스트랩 등,
 * RLS 를 우회해 초기 데이터를 심어야 하는 경우.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client 초기화 실패: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
