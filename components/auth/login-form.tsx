"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { loginAction } from "@/app/(marketing)/auth-actions";
import { AUTH_FORM_INITIAL_STATE } from "@/app/(marketing)/auth-form-state";

export function LoginForm({ pendingSignup }: { pendingSignup?: boolean }) {
  const [state, formAction] = useFormState(loginAction, AUTH_FORM_INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {pendingSignup ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          회원가입이 접수되었습니다. 가입 확인 메일을 확인한 뒤 로그인해 주세요.
        </p>
      ) : null}

      <Field
        id="login-email"
        name="email"
        type="email"
        label="이메일"
        autoComplete="email"
        required
      />
      <Field
        id="login-password"
        name="password"
        type="password"
        label="비밀번호"
        autoComplete="current-password"
        required
      />

      {state.error ? <ErrorBanner message={state.error} /> : null}

      <SubmitButton label="로그인" pendingLabel="로그인 중..." />

      <p className="text-center text-xs text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary hover:underline"
        >
          7일 무료로 시작하기
        </Link>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* 공용 조각                                                           */
/* ------------------------------------------------------------------ */

interface FieldProps {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  minLength?: number;
}

export function Field({
  id,
  name,
  type,
  label,
  autoComplete,
  required,
  placeholder,
  helperText,
  minLength,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className="h-10 rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
      {helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : null}
      {pending ? pendingLabel : label}
    </button>
  );
}
