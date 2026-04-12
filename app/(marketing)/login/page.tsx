import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams?: { signup?: string };
}

export const metadata = {
  title: "로그인 | 장사 계산기",
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const pendingSignup = searchParams?.signup === "pending";

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16 md:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          로그인
        </h1>
        <p className="text-xs text-muted-foreground">
          이메일과 비밀번호를 입력해 주세요.
        </p>
      </div>

      <LoginForm pendingSignup={pendingSignup} />

      <p className="text-center text-[11px] text-muted-foreground">
        <Link href="/" className="hover:underline">
          ← 홈으로 돌아가기
        </Link>
      </p>
    </section>
  );
}
