import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "회원가입 | 장사 계산기",
};

export default function SignupPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16 md:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          7일 무료 체험 시작
        </h1>
        <p className="text-xs text-muted-foreground">
          이메일 주소와 비밀번호만 있으면 바로 시작할 수 있습니다.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-[11px] text-muted-foreground">
        <Link href="/" className="hover:underline">
          ← 홈으로 돌아가기
        </Link>
      </p>
    </section>
  );
}
