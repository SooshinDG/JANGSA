import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe SDK v22+ 에서는 일부 최상위 프로퍼티가 변경되었다.
 * webhook 핸들러는 raw JSON 기반이므로, 안전하게 접근하기 위해
 * Record 로 캐스팅한 뒤 읽는 헬퍼를 사용한다.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function raw(obj: unknown): Record<string, any> {
  return obj as Record<string, any>;
}

/**
 * Stripe webhook 이벤트 핸들러 + subscriptions/stores 상태 동기화.
 *
 * 원칙:
 * - 모든 핸들러는 idempotent (같은 이벤트 재수신해도 안전)
 * - 상태 동기화는 `subscriptions` 와 `stores.status` 를 항상 함께 갱신
 * - service role 로 RLS 우회
 * - payments 테이블에 이벤트 로그 적재 (디버깅용)
 */

const LOG = "[stripe-webhook]";

type AppStatus = "active" | "past_due" | "cancelled" | "expired";

/* ================================================================ */
/* Stripe → app 상태 매핑                                            */
/* ================================================================ */

function mapStripeStatus(stripeStatus: string): AppStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "cancelled";
    case "incomplete_expired":
      return "expired";
    default:
      console.warn(`${LOG} unknown Stripe status: ${stripeStatus}, defaulting to past_due`);
      return "past_due";
  }
}

/* ================================================================ */
/* 공통: subscriptions + stores.status 동기화                        */
/* ================================================================ */

interface SyncParams {
  storeId: string;
  appStatus: AppStatus;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  externalPriceId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  canceledAt?: string | null;
  eventType: string;
  eventTimestamp: number; // epoch seconds from Stripe
}

async function syncSubscriptionAndStore(params: SyncParams) {
  const admin = createSupabaseAdminClient();
  const eventAt = new Date(params.eventTimestamp * 1000).toISOString();

  // subscriptions update
  const subUpdate: Record<string, unknown> = {
    status: params.appStatus,
    last_event_at: eventAt,
  };
  if (params.externalSubscriptionId) {
    subUpdate.external_subscription_id = params.externalSubscriptionId;
  }
  if (params.externalCustomerId) {
    subUpdate.external_customer_id = params.externalCustomerId;
  }
  if (params.externalPriceId) {
    subUpdate.external_price_id = params.externalPriceId;
  }
  if (params.currentPeriodStart) {
    subUpdate.current_period_start = params.currentPeriodStart;
  }
  if (params.currentPeriodEnd) {
    subUpdate.current_period_end = params.currentPeriodEnd;
  }
  if (params.canceledAt !== undefined) {
    subUpdate.canceled_at = params.canceledAt;
  }
  subUpdate.billing_provider = "stripe";
  subUpdate.plan_code = "starter";

  const { error: subErr } = await admin
    .from("subscriptions")
    .update(subUpdate)
    .eq("store_id", params.storeId);

  if (subErr) {
    console.error(`${LOG} subscriptions update failed: ${subErr.message}`);
  }

  // stores.status update
  const { error: storeErr } = await admin
    .from("stores")
    .update({ status: params.appStatus })
    .eq("id", params.storeId);

  if (storeErr) {
    console.error(`${LOG} stores.status update failed: ${storeErr.message}`);
  }

  console.log(
    `${LOG} sync done storeId=${params.storeId} event=${params.eventType} ` +
      `appStatus=${params.appStatus}`,
  );
}

/* ================================================================ */
/* payments 이벤트 로그                                              */
/* ================================================================ */

async function logPaymentEvent(
  storeId: string | null,
  eventType: string,
  payload: {
    externalPaymentId?: string;
    externalSubscriptionId?: string;
    amount?: number;
    currency?: string;
    status?: string;
  },
  rawEvent: unknown,
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("payments").insert({
    store_id: storeId,
    provider: "stripe",
    event_type: eventType,
    external_payment_id: payload.externalPaymentId ?? null,
    external_subscription_id: payload.externalSubscriptionId ?? null,
    amount: payload.amount ?? null,
    currency: payload.currency ?? null,
    status: payload.status ?? null,
    raw_payload: rawEvent,
  });
  if (error) {
    console.error(`${LOG} payments log insert failed: ${error.message}`);
  }
}

/* ================================================================ */
/* store_id 조회 헬퍼                                                */
/* ================================================================ */

async function findStoreIdByExternalSub(
  externalSubscriptionId: string,
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("store_id")
    .eq("external_subscription_id", externalSubscriptionId)
    .limit(1)
    .maybeSingle();
  return (data?.store_id as string) ?? null;
}

/* ================================================================ */
/* 이벤트 핸들러                                                      */
/* ================================================================ */

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
) {
  const storeId = session.metadata?.store_id;
  if (!storeId) {
    console.error(`${LOG} checkout.session.completed missing store_id in metadata`);
    return;
  }

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const custId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  await syncSubscriptionAndStore({
    storeId,
    appStatus: "active",
    externalSubscriptionId: subId ?? undefined,
    externalCustomerId: custId ?? undefined,
    eventType: "checkout.session.completed",
    eventTimestamp: session.created,
  });

  await logPaymentEvent(
    storeId,
    "checkout.session.completed",
    {
      externalSubscriptionId: subId ?? undefined,
      amount: session.amount_total ?? undefined,
      currency: session.currency ?? undefined,
      status: session.payment_status,
    },
    session,
  );
}

export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
) {
  const r = raw(sub);
  const storeId =
    sub.metadata?.store_id ??
    (await findStoreIdByExternalSub(sub.id));
  if (!storeId) {
    console.error(`${LOG} subscription.updated: cannot resolve store_id for sub=${sub.id}`);
    return;
  }

  const appStatus = mapStripeStatus(sub.status);
  const priceId = sub.items.data[0]?.price?.id;
  const periodStart = r.current_period_start as number | undefined;
  const periodEnd = r.current_period_end as number | undefined;
  const canceledAt = r.canceled_at as number | null | undefined;

  await syncSubscriptionAndStore({
    storeId,
    appStatus,
    externalSubscriptionId: sub.id,
    externalPriceId: priceId,
    currentPeriodStart: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : undefined,
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : undefined,
    canceledAt: canceledAt
      ? new Date(canceledAt * 1000).toISOString()
      : null,
    eventType: "customer.subscription.updated",
    eventTimestamp: sub.created,
  });
}

export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
) {
  const storeId =
    sub.metadata?.store_id ??
    (await findStoreIdByExternalSub(sub.id));
  if (!storeId) {
    console.error(`${LOG} subscription.deleted: cannot resolve store_id for sub=${sub.id}`);
    return;
  }

  await syncSubscriptionAndStore({
    storeId,
    appStatus: "cancelled",
    externalSubscriptionId: sub.id,
    canceledAt: new Date().toISOString(),
    eventType: "customer.subscription.deleted",
    eventTimestamp: Math.floor(Date.now() / 1000),
  });

  await logPaymentEvent(storeId, "customer.subscription.deleted", {
    externalSubscriptionId: sub.id,
    status: "cancelled",
  }, sub);
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const r = raw(invoice);
  const subField = r.subscription;
  const subId =
    typeof subField === "string" ? subField : subField?.id as string | undefined;
  if (!subId) return;

  const storeId = await findStoreIdByExternalSub(subId);
  if (!storeId) {
    console.warn(`${LOG} invoice.paid: cannot resolve store_id for sub=${subId}`);
    return;
  }

  const piField = r.payment_intent;
  const paymentId = typeof piField === "string" ? piField : piField?.id as string | undefined;

  await syncSubscriptionAndStore({
    storeId,
    appStatus: "active",
    externalSubscriptionId: subId,
    eventType: "invoice.paid",
    eventTimestamp: invoice.created,
  });

  await logPaymentEvent(storeId, "invoice.paid", {
    externalPaymentId: paymentId,
    externalSubscriptionId: subId,
    amount: r.amount_paid as number | undefined,
    currency: invoice.currency ?? undefined,
    status: invoice.status ?? "paid",
  }, invoice);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const r = raw(invoice);
  const subField = r.subscription;
  const subId =
    typeof subField === "string" ? subField : subField?.id as string | undefined;
  if (!subId) return;

  const storeId = await findStoreIdByExternalSub(subId);
  if (!storeId) {
    console.warn(`${LOG} invoice.payment_failed: cannot resolve store_id for sub=${subId}`);
    return;
  }

  const piField = r.payment_intent;
  const paymentId = typeof piField === "string" ? piField : piField?.id as string | undefined;

  await syncSubscriptionAndStore({
    storeId,
    appStatus: "past_due",
    externalSubscriptionId: subId,
    eventType: "invoice.payment_failed",
    eventTimestamp: invoice.created,
  });

  await logPaymentEvent(storeId, "invoice.payment_failed", {
    externalPaymentId: paymentId,
    externalSubscriptionId: subId,
    amount: r.amount_due as number | undefined,
    currency: invoice.currency ?? undefined,
    status: "payment_failed",
  }, invoice);
}
