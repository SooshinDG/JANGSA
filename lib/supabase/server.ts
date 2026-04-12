import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트 / server action / route handler 에서 사용하는 Supabase 클라이언트.
 *
 * Next.js 14 App Router 에서는 server component 가 쿠키를 "읽기만" 할 수 있고
 * "쓰기" 는 server action 또는 route handler 에서만 가능하다.
 * 아래 set/remove 는 server component 호출 시 예외를 던질 수 있으므로
 * try/catch 로 무시한다.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // server component 에서 호출 시에는 무시한다.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // 동일
          }
        },
      },
    },
  );
}
