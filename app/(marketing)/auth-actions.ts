"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapAppAccount } from "@/lib/auth/bootstrap";
import type { AuthFormState } from "./auth-form-state";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (lower.includes("user already registered")) {
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  }
  if (lower.includes("email not confirmed")) {
    return "이메일 확인이 필요합니다. 가입 시 받은 링크를 확인해주세요.";
  }
  return message;
}

/* ------------------------------------------------------------------ */
/* 로그인                                                              */
/* ------------------------------------------------------------------ */

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "이메일 형식이 올바르지 않습니다." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { error: normalizeSupabaseError(error.message) };
  }

  const loggedInUser = data.user;
  if (!loggedInUser) {
    return {
      error: "로그인 세션을 확인할 수 없습니다. 다시 시도해 주세요.",
    };
  }

  // 인증은 성공했지만 아직 앱 데이터가 완성되지 않은 계정(부분 생성 상태 포함)을
  // 로그인 경로에서 한 번 더 복구한다.
  // bootstrapAppAccount 는 ensure-every-row 방식이라 재호출해도 안전하다.
  // ❗ 여기서 실패를 `redirect("/app/dashboard")` 로 숨기지 않는다.
  //    실패 시 폼에 에러를 표시해 사용자가 상황을 인지하고 재시도할 수 있게 한다.
  try {
    await bootstrapAppAccount({
      userId: loggedInUser.id,
      email: loggedInUser.email ?? email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error("[loginAction] bootstrap failed:", msg);
    return {
      error: `로그인은 성공했지만 앱 계정 초기화에 실패했습니다. 잠시 후 다시 시도해 주세요. (${msg})`,
    };
  }

  redirect("/app/dashboard");
}

/* ------------------------------------------------------------------ */
/* 회원가입                                                            */
/* ------------------------------------------------------------------ */

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  // store_name 은 아직 폼에 존재하지만, bootstrap 은 로그인 시점으로 미뤄졌으므로
  // 이 단계에서는 사용하지 않는다. 향후 온보딩 플로우에서 활용 가능.
  const _storeName = String(formData.get("store_name") ?? "").trim();
  void _storeName; // lint unused-variable 방지

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "이메일 형식이 올바르지 않습니다." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상으로 설정해 주세요." };
  }
  if (password !== confirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: normalizeSupabaseError(error.message) };
  }

  // ⚠️ 회원가입 단계에서는 bootstrapAppAccount() 를 호출하지 않는다.
  //
  // Supabase 의 signUp 동작:
  // - "Confirm email" 이 켜져 있으면 session=null 이고, user 는 아직 unconfirmed 상태.
  //   이 시점의 user.id 로 profiles FK INSERT 를 하면
  //   auth.users 에 confirmed row 가 없어 FK violation 발생.
  // - 이미 등록된 이메일에 대해 signUp 하면 Supabase 가 obfuscated 가짜 user 를
  //   반환할 수 있어 역시 FK violation 위험이 있음.
  //
  // 대신, 앱 계정 row 생성은 아래 두 시점에서만 수행:
  // 1. loginAction — signInWithPassword 성공 후 (auth.users 에 confirmed row 보장)
  // 2. requireStoreContext — 보호 레이아웃 진입 시 (방어 회로)

  // 이미 등록된 이메일에 대한 signUp 은 Supabase 기본 설정에서는 에러를 안 주고
  // 가짜 user + session=null 을 돌려준다. 이 경우도 아래 로직에 자연스럽게 합류:
  // session 이 없으면 → /login?signup=pending 으로 유도해 이메일 확인을 안내.

  if (!data.session) {
    redirect("/login?signup=pending");
  }

  // session 이 있는 경우 (Confirm email OFF 인 프로젝트):
  // 아직 bootstrap 을 하지 않았지만, /app/dashboard 진입 시
  // requireStoreContext → bootstrapAppAccount 가 자동 실행되므로 안전.
  redirect("/app/dashboard");
}
