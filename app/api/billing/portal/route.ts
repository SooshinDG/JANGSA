import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeServer } from "@/lib/stripe/config";

/**
 * POST /api/billing/portal
 *
 * Stripe Customer Portal session 을 생성해 URL 을 반환한다.
 * 사용자는 이 URL 에서 카드 변경 / 구독 해지 / 결제 이력 확인이 가능하다.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("external_customer_id, store_id")
      .eq("store_id", (
        await admin
          .from("store_memberships")
          .select("store_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single()
      ).data?.store_id ?? "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerId = subscription?.external_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json(
        { error: "결제 정보를 찾을 수 없습니다. 먼저 구독을 시작해 주세요." },
        { status: 400 },
      );
    }

    const origin = request.headers.get("origin") ?? request.nextUrl.origin;
    const stripe = getStripeServer();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/app/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[billing-portal] error:", msg);
    return NextResponse.json(
      { error: `결제 관리 페이지를 준비하지 못했습니다: ${msg}` },
      { status: 500 },
    );
  }
}
