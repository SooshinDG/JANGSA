import { NextResponse, type NextRequest } from "next/server";
import { getStripeServer } from "@/lib/stripe/config";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/stripe/webhook-handlers";
import type Stripe from "stripe";

const LOG = "[stripe-webhook-route]";

/**
 * POST /api/billing/webhook
 *
 * Stripe 가 호출하는 webhook endpoint.
 * 서명 검증 후 이벤트 타입에 따라 subscriptions/stores 상태를 동기화한다.
 *
 * ⚠️ 이 route 에 body parser 를 적용하면 서명 검증이 실패한다.
 *    Next.js App Router 에서는 기본적으로 raw body 를 사용하므로 별도 설정 불필요.
 */

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(`${LOG} STRIPE_WEBHOOK_SECRET 환경변수 미설정`);
    return NextResponse.json(
      { error: "webhook secret not configured" },
      { status: 500 },
    );
  }

  // raw body 를 Buffer 로 읽는다 (서명 검증에 필요)
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.error(`${LOG} missing stripe-signature header`);
    return NextResponse.json(
      { error: "missing signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeServer();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(`${LOG} signature verification failed: ${msg}`);
    return NextResponse.json(
      { error: `webhook verification failed: ${msg}` },
      { status: 400 },
    );
  }

  console.log(`${LOG} event received: ${event.type} id=${event.id}`);

  // 핸들링. 개별 핸들러 실패는 로그만 남기고 200 반환한다.
  // (Stripe 가 재시도하게 5xx 를 주면 무한 재시도 위험)
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      default:
        console.log(`${LOG} unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(`${LOG} handler error for ${event.type}: ${msg}`);
    // 반드시 200 반환 — 5xx 면 Stripe 가 무한 재시도
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
