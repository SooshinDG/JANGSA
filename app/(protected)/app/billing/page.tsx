import { CheckCircle2, CreditCard, Info, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { requireStoreContext } from "@/lib/auth/guards";
import { getTrialDaysRemaining } from "@/lib/auth/access";
import { BillingCTA } from "@/components/billing/billing-cta";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";

export const metadata = {
  title: "결제 / 구독 | 장사 계산기",
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  trialing: { label: "무료 체험 중", tone: "text-primary" },
  active: { label: "구독 활성", tone: "text-emerald-600" },
  past_due: { label: "결제 실패", tone: "text-amber-600" },
  cancelled: { label: "해지됨", tone: "text-amber-600" },
  expired: { label: "체험 종료", tone: "text-destructive" },
  suspended: { label: "정지됨", tone: "text-destructive" },
};

const PLAN_FEATURES = [
  "채널별 매출·수수료·순이익 자동 계산",
  "월별 정산표 · 일별 정산표 · KPI 대시보드",
  "손익분기점(BEP) · 목표 달성률 · 전월 대비",
  "JSON 전체 백업 / 월별 CSV 내보내기",
];

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
}

export default async function BillingPage() {
  const { store, accessStatus, subscription } = await requireStoreContext();
  const trialDays = getTrialDaysRemaining(store.trial_ends_at);
  const info = STATUS_LABEL[accessStatus] ?? STATUS_LABEL.trialing;

  const needsPayment =
    accessStatus === "trialing" ||
    accessStatus === "expired" ||
    accessStatus === "past_due" ||
    accessStatus === "cancelled";

  return (
    <>
      <PageHeader
        title="결제 / 구독"
        description="매장의 구독 상태를 확인하고 결제를 관리합니다."
      />

      {/* 현재 상태 */}
      <SectionCard title="현재 상태">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Stat label="매장명" value={store.store_name ?? "내 매장"} />
          <Stat label="상태" value={info.label} className={info.tone} />
          <Stat label="체험 시작일" value={fmtDate(store.trial_started_at)} />
          <Stat
            label="체험 종료일"
            value={fmtDate(store.trial_ends_at)}
            hint={
              accessStatus === "trialing"
                ? `${trialDays}일 남음`
                : accessStatus === "expired"
                  ? "이미 종료됨"
                  : undefined
            }
          />
          {subscription?.current_period_end ? (
            <Stat
              label="다음 결제일"
              value={fmtDate(subscription.current_period_end)}
            />
          ) : null}
          {subscription?.billing_provider ? (
            <Stat
              label="결제 수단"
              value={
                subscription.billing_provider === "stripe"
                  ? "Stripe"
                  : subscription.billing_provider
              }
            />
          ) : null}
        </dl>
      </SectionCard>

      {/* 플랜 + 결제 CTA */}
      <SectionCard title="Starter 플랜">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                29,000원
              </span>
              <span className="text-sm text-muted-foreground">/ 월</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              VAT 포함 31,900원 · 매장 1개 기준 · 언제든 해지 가능
            </p>
          </div>

          <ul className="space-y-1.5 text-sm">
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

          {needsPayment ? (
            <BillingCTA accessStatus={accessStatus} trialDays={trialDays} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                <span className="font-semibold">현재 구독은 활성 상태입니다.</span>
              </div>
              <ManageBillingButton />
            </div>
          )}

          {/* past_due / cancelled 에서도 portal 접근 허용 */}
          {(accessStatus === "past_due" || accessStatus === "cancelled") ? (
            <ManageBillingButton />
          ) : null}
        </div>
      </SectionCard>

      {/* FAQ */}
      <SectionCard title="자주 묻는 질문">
        <dl className="space-y-3 text-xs">
          <div>
            <dt className="font-semibold text-foreground">
              무료 체험 중에 결제하면 어떻게 되나요?
            </dt>
            <dd className="mt-0.5 text-muted-foreground">
              체험 기간과 관계없이 즉시 구독이 시작되고, 결제일 기준 한 달 단위로
              청구됩니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">
              해지하면 데이터는 어떻게 되나요?
            </dt>
            <dd className="mt-0.5 text-muted-foreground">
              해지 후에도 데이터는 삭제되지 않으며 읽기 전용으로 조회할 수
              있습니다. JSON/CSV 내보내기도 가능합니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">
              다시 결제하면 바로 사용할 수 있나요?
            </dt>
            <dd className="mt-0.5 text-muted-foreground">
              네. 결제 완료 즉시 모든 기능이 다시 활성화됩니다.
            </dd>
          </div>
        </dl>
      </SectionCard>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 text-base font-semibold tabular-nums ${className ?? "text-foreground"}`}
      >
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
