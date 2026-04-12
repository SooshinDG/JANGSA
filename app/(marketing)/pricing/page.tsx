import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "요금제 | 장사 계산기",
};

const PLAN_FEATURES = [
  "채널별 매출·수수료·순이익 자동 계산",
  "월별 정산표 · 일별 정산표 · KPI 대시보드",
  "손익분기점(BEP) / 목표 달성률 / 전월 대비",
  "JSON 전체 백업 / 월별 CSV 내보내기",
  "데이터 초기화 · 샘플 데이터 주입",
];

export default function PricingPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16 md:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          요금제
        </h1>
        <p className="text-sm text-muted-foreground">
          단일 플랜으로 모든 기능을 이용할 수 있습니다. 가입 직후 7일간 무료
          체험 후 결제로 전환됩니다.
        </p>
      </div>

      <div className="rounded-xl border border-primary/40 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Starter (단일 플랜)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-foreground">
              29,000원
            </span>
            <span className="text-sm text-muted-foreground">/ 월</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            VAT 포함 31,900원 · 7일 무료 체험 후 자동 결제
          </p>
        </div>

        <ul className="mt-6 space-y-2 text-sm">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              />
              <span className="text-foreground">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            7일 무료로 시작하기
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-lg border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            로그인
          </Link>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        * 결제 기능은 다음 단계에서 연결됩니다. 현재는 가입 즉시 7일 체험 상태로
        시작되며, 체험 기간에는 모든 기능을 제한 없이 이용할 수 있습니다.
      </p>
    </section>
  );
}
