import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeServer, getMonthlyPriceId } from "@/lib/stripe/config";

/**
 * POST /api/billing/checkout
 *
 * 현재 로그인 사용자의 store 를 기준으로 Stripe Checkout Session 을 생성한다.
 * 프론트에서 반환된 URL 로 redirect 해 결제를 진행한다.
 */

export async function POST(request: NextRequest) {
  try {
    // 1) 인증 확인
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2) store + subscription 조회
    const admin = createSupabaseAdminClient();
    const { data: membership } = await admin
      .from("store_memberships")
      .select("store_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership?.store_id) {
      return NextResponse.json(
        { error: "매장 정보를 찾을 수 없습니다." },
        { status: 400 },
      );
    }

    const storeId = membership.store_id as string;

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("external_customer_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3) Stripe customer 확보 (기존 또는 신규)
    const stripe = getStripeServer();
    let customerId = (subscription?.external_customer_id as string) ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { store_id: storeId, user_id: user.id },
      });
      customerId = customer.id;

      // 저장
      await admin
        .from("subscriptions")
        .update({ external_customer_id: customerId })
        .eq("store_id", storeId);
    }

    // 4) Checkout Session 생성
    const origin = request.headers.get("origin") ?? request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getMonthlyPriceId(), quantity: 1 }],
      metadata: { store_id: storeId, user_id: user.id },
      subscription_data: {
        metadata: { store_id: storeId, user_id: user.id },
      },
      success_url: `${origin}/app/billing?success=true`,
      cancel_url: `${origin}/app/billing?canceled=true`,
      locale: "ko",
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "결제 세션을 생성하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[checkout] error:", message);
    return NextResponse.json(
      { error: `결제 페이지를 준비하지 못했습니다: ${message}` },
      { status: 500 },
    );
  }
}
