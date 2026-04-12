import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const FEATURES = [
  "배달의민족 · 요기요 · 쿠팡이츠 · POS 채널별 매출 자동 합산",
  "채널별 수수료율·원가율·포장비율 기반 순이익 자동 계산",
  "월별 정산표 / 손익분기점(BEP) / 전월 대비 성장률",
  "JSON 백업 · CSV 내보내기 · 샘플 데이터 주입",
];

export default function MarketingLandingPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-10 px-4 py-16 md:px-8 md:py-24">
      <div className="max-w-2xl space-y-5">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">
          7일 무료 체험 · 카드 등록 불필요
        </span>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
          엑셀 없이,
          <br />
          매출·순이익·수수료를
          <br />
          자동으로 계산하세요
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          배민 / 요기요 / 쿠팡이츠 / POS 매출을 입력하면 채널별 수수료와 원가,
          고정비를 반영한 월별 정산을 자동으로 만들어 드립니다.
          사장님이 해야 할 건 입력뿐입니다.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            7일 무료로 시작하기
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center rounded-lg border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            요금제 보기
          </Link>
        </div>
      </div>

      <ul className="grid w-full gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
