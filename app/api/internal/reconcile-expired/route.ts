import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/internal/reconcile-expired
 *
 * trial_ends_at 이 지났지만 아직 stores.status='trialing' 인 store 를 찾아
 * expired 로 전환한다. 활성 결제(subscription.status='active')가 있으면 건너뛴다.
 *
 * Vercel Cron 에서 매일 1회 호출된다 (vercel.json).
 * 보안: Authorization: Bearer <CRON_SECRET> 필수.
 */

const LOG = "[reconcile-expired]";

export async function GET(request: NextRequest) {
  // 1) secret 검증
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`${LOG} CRON_SECRET 환경변수 미설정`);
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // 2) trial 만료 store 조회
  const { data: expiredStores, error: queryErr } = await admin
    .from("stores")
    .select("id")
    .eq("status", "trialing")
    .lt("trial_ends_at", new Date().toISOString());

  if (queryErr) {
    console.error(`${LOG} query error: ${queryErr.message}`);
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  if (!expiredStores || expiredStores.length === 0) {
    console.log(`${LOG} no expired trialing stores found`);
    return NextResponse.json({ processed: 0 });
  }

  console.log(`${LOG} found ${expiredStores.length} expired trialing store(s)`);

  let processed = 0;

  for (const store of expiredStores) {
    const storeId = store.id as string;

    // 활성 subscription 이 있으면 건너뛴다 (webhook 으로 이미 active 됐어야 하지만 방어)
    const { data: activeSub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("store_id", storeId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      // 결제 활성인데 store 가 아직 trialing → active 로 보정
      await admin.from("stores").update({ status: "active" }).eq("id", storeId);
      console.log(`${LOG} store=${storeId} corrected to active (has active subscription)`);
      processed++;
      continue;
    }

    // expired 로 전환
    await admin.from("stores").update({ status: "expired" }).eq("id", storeId);
    await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("store_id", storeId)
      .eq("status", "trialing");

    console.log(`${LOG} store=${storeId} → expired`);
    processed++;
  }

  console.log(`${LOG} done, processed=${processed}`);
  return NextResponse.json({ processed });
}
