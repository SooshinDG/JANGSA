import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bootstrapAppAccount } from "./bootstrap";
import { getAccessStatusFromStore } from "./access";
import type {
  StoreContext,
  StoreMembershipRow,
  StoreRow,
  SubscriptionRow,
} from "./types";

/**
 * 서버 컴포넌트 / server action 에서 쓰는 보호 유틸.
 *
 * `requireStoreContext()` 는:
 *  - 로그인 안 되어 있으면 /login 으로 redirect
 *  - 로그인은 되어 있지만 store context 가 없으면 bootstrap 을 자동 실행
 *  - 그래도 실패하면 `/account-setup-error?reason=...` 으로 redirect
 *
 * ⚠️ 실패 진단 시 user-scoped client 와 admin client 양쪽을 대조해
 *    "실제로 row 가 없는 것"(admin 도 못 봄)인지
 *    "RLS 가 차단하는 것"(admin 은 보이지만 user 는 못 봄)인지 구분한다.
 */

const LOG = "[requireStoreContext]";

function toSetupError(reason: string): never {
  redirect(
    `/account-setup-error?reason=${encodeURIComponent(reason)}`,
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requireStoreContext(): Promise<StoreContext> {
  /* ---- user-scoped client (RLS 적용) ---- */
  const userClient = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr) {
    console.error(`${LOG} getUser error:`, userErr.message);
  }

  if (!user) {
    console.warn(`${LOG} no session → redirect /login`);
    redirect("/login");
  }

  console.log(`${LOG} user.id=${user.id} email=${user.email ?? "-"}`);

  /* ---- 0) profile 진단 (선택, 로그용) ---- */
  {
    const { data: profileFromUserClient } = await userClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    console.log(
      `${LOG} profile (userClient): ${profileFromUserClient ? "found" : "NOT found"}`,
    );
    if (!profileFromUserClient) {
      const { data: profileFromAdminClient } = await admin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      console.log(
        `${LOG} profile (adminClient): ${profileFromAdminClient ? "found" : "NOT found"}`,
      );
    }
  }

  /* ---- 1) membership 1차 조회 (user-scoped) ---- */
  let membershipFromUserClient: StoreMembershipRow | null = null;
  {
    const { data, error: selErr } = await userClient
      .from("store_memberships")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<StoreMembershipRow>();
    if (selErr) {
      console.error(`${LOG} membership select (userClient) error: ${selErr.message}`);
    }
    membershipFromUserClient = data ?? null;
    console.log(
      `${LOG} membership 1st (userClient): ${
        membershipFromUserClient
          ? `found store_id=${membershipFromUserClient.store_id}`
          : "NOT found"
      }`,
    );
  }

  /* ---- 2) 없으면 bootstrap ---- */
  let bootstrapRan = false;
  if (!membershipFromUserClient) {
    bootstrapRan = true;
    console.warn(`${LOG} membership missing → running bootstrapAppAccount`);
    try {
      const bsResult = await bootstrapAppAccount({
        userId: user.id,
        email: user.email ?? null,
      });
      console.log(
        `${LOG} bootstrap done storeId=${bsResult.storeId} ` +
          `profileV=${bsResult.profileVerified} storeV=${bsResult.storeVerified} ` +
          `membershipV=${bsResult.membershipVerified} settingsV=${bsResult.settingsVerified} ` +
          `subscriptionV=${bsResult.subscriptionVerified}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${LOG} bootstrap threw: ${msg}`);
      toSetupError(`bootstrap_failed:${msg}`);
    }

    /* ---- 3) membership 재조회 (user-scoped) ---- */
    {
      const { data, error: selErr } = await userClient
        .from("store_memberships")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<StoreMembershipRow>();
      if (selErr) {
        console.error(`${LOG} membership retry (userClient) error: ${selErr.message}`);
      }
      membershipFromUserClient = data ?? null;
      console.log(
        `${LOG} membership retry (userClient): ${
          membershipFromUserClient
            ? `found store_id=${membershipFromUserClient.store_id}`
            : "NOT found"
        }`,
      );
    }

    /* ---- 4) 그래도 없으면 admin fallback 진단 ---- */
    if (!membershipFromUserClient) {
      const { data: membershipFromAdminClient } = await admin
        .from("store_memberships")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<StoreMembershipRow>();
      console.log(
        `${LOG} membership (adminClient): ${
          membershipFromAdminClient
            ? `found store_id=${membershipFromAdminClient.store_id}`
            : "NOT found"
        }`,
      );

      if (membershipFromAdminClient) {
        console.error(
          `${LOG} DIAGNOSIS: membership EXISTS in DB (admin sees it) but user client CANNOT see it. ` +
            `This points to an RLS policy issue on store_memberships. ` +
            `user.id=${user.id} store_id=${membershipFromAdminClient.store_id}`,
        );
        toSetupError("membership_exists_but_not_visible_to_user_client");
      } else {
        console.error(
          `${LOG} DIAGNOSIS: membership does NOT exist even for admin. ` +
            `Bootstrap claimed success but row is absent. userId=${user.id}`,
        );
        toSetupError("membership_missing_even_for_admin");
      }
    }
  }

  const membership = membershipFromUserClient!;

  /* ---- 5) store 조회 (user-scoped) ---- */
  let storeFromUserClient: StoreRow | null = null;
  {
    const { data, error: selErr } = await userClient
      .from("stores")
      .select("*")
      .eq("id", membership.store_id)
      .single<StoreRow>();
    if (selErr) {
      console.error(`${LOG} store select (userClient) error: ${selErr.message}`);
    }
    storeFromUserClient = data ?? null;
    console.log(
      `${LOG} store (userClient): ${
        storeFromUserClient
          ? `found id=${storeFromUserClient.id} status=${storeFromUserClient.status}`
          : "NOT found"
      }`,
    );
  }

  /* ---- 6) store admin fallback 진단 ---- */
  if (!storeFromUserClient) {
    const { data: storeFromAdminClient } = await admin
      .from("stores")
      .select("*")
      .eq("id", membership.store_id)
      .single<StoreRow>();
    console.log(
      `${LOG} store (adminClient): ${
        storeFromAdminClient
          ? `found id=${storeFromAdminClient.id}`
          : "NOT found"
      }`,
    );

    if (storeFromAdminClient) {
      console.error(
        `${LOG} DIAGNOSIS: store EXISTS (admin sees it) but user client CANNOT see it. ` +
          `RLS policy issue on stores. store_id=${membership.store_id}`,
      );
      toSetupError("store_exists_but_not_visible_to_user_client");
    } else {
      console.error(
        `${LOG} DIAGNOSIS: store does NOT exist even for admin. ` +
          `store_id=${membership.store_id}`,
      );
      toSetupError("store_missing_even_for_admin");
    }
  }

  const store = storeFromUserClient!;

  /* ---- 7) subscription 조회 ---- */
  const { data: subscription, error: subErr } = await userClient
    .from("subscriptions")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (subErr) {
    console.warn(`${LOG} subscription select (userClient) error: ${subErr.message}`);
  }
  console.log(
    `${LOG} subscription (userClient): ${
      subscription ? `id=${subscription.id} status=${subscription.status}` : "none"
    }`,
  );

  const accessStatus = getAccessStatusFromStore(store);

  console.log(
    `${LOG} resolved OK userId=${user.id} storeId=${store.id} ` +
      `accessStatus=${accessStatus} bootstrapRan=${bootstrapRan}`,
  );

  return {
    userId: user.id,
    email: user.email ?? null,
    store,
    membership,
    subscription: subscription ?? null,
    accessStatus,
  };
}
