"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signupAction } from "@/app/(marketing)/auth-actions";
import { AUTH_FORM_INITIAL_STATE } from "@/app/(marketing)/auth-form-state";
import {
  ErrorBanner,
  Field,
  SubmitButton,
} from "@/components/auth/login-form";

export function SignupForm() {
  const [state, formAction] = useFormState(signupAction, AUTH_FORM_INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="rounded-md border border-primary/30 bg-accent/50 px-3 py-2 text-[11px] leading-relaxed text-accent-foreground">
        가입 즉시 <strong>7일 무료 체험</strong>이 시작됩니다. 카드 등록은
        필요하지 않습니다.
      </div>

      <Field
        id="signup-store-name"
        name="store_name"
        type="text"
        label="매장명 (선택)"
        placeholder="예: 홍대 로스터리"
      />
      <Field
        id="signup-email"
        name="email"
        type="email"
        label="이메일"
        autoComplete="email"
        required
      />
      <Field
        id="signup-password"
        name="password"
        type="password"
        label="비밀번호"
        autoComplete="new-password"
        required
        minLength={8}
        helperText="8자 이상"
      />
      <Field
        id="signup-password-confirm"
        name="password_confirm"
        type="password"
        label="비밀번호 확인"
        autoComplete="new-password"
        required
        minLength={8}
      />

      {state.error ? <ErrorBanner message={state.error} /> : null}

      <SubmitButton label="무료 체험 시작하기" pendingLabel="계정 생성 중..." />

      <p className="text-center text-xs text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          로그인
        </Link>
      </p>
    </form>
  );
}
