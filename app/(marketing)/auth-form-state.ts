/**
 * 공용 auth form 상태 타입/초기값.
 *
 * `auth-actions.ts` 는 `"use server"` 파일이라 async function 만 export 할 수 있으므로,
 * 타입/상수는 이 일반 모듈에 분리한다. 클라이언트 폼과 서버 액션 양쪽에서 import 가능하다.
 */

export interface AuthFormState {
  error: string | null;
}

export const AUTH_FORM_INITIAL_STATE: AuthFormState = { error: null };
