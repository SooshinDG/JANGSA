import { NextResponse } from "next/server";

/**
 * POST /api/billing/webhook — 무료 서비스 전환 후 비활성화 (410 Gone).
 * Stripe webhook endpoint. 더 이상 처리하지 않으나 200 을 반환해 Stripe 재시도를 막는다.
 */
export async function POST() {
  return NextResponse.json({ received: true, disabled: true }, { status: 200 });
}
