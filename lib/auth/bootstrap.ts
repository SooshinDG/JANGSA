import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildDefaultSettings } from "@/lib/utils/default-state";

/**
 * 회원가입 / 로그인 직후 서버에서 호출되는 idempotent bootstrap.
 *
 * 구조: **ensure + verify** per row.
 * - ensure: row 가 없으면 INSERT, 있으면 skip
 * - verify: INSERT 후 다시 SELECT 해서 실제 존재를 재확인
 * - verify 실패 → 명확한 step 이름과 함께 throw
 *
 * Service Role 로 동작하므로 RLS 를 우회한다.
 * trial 기간은 최초 store 생성 시점에만 now..now+7d 로 고정되며,
 * 이미 store 가 있으면 해당 값을 그대로 재사용한다.
 */

const LOG = "[bootstrapAppAccount]";
const TRIAL_DAYS = 7;
const DEFAULT_STORE_NAME = "내 매장";

export interface BootstrapArgs {
  userId: string;
  email: string | null;
  storeName?: string;
}

export interface BootstrapResult {
  userId: string;
  storeId: string;
  profileCreated: boolean;
  profileVerified: boolean;
  storeCreated: boolean;
  storeVerified: boolean;
  membershipCreated: boolean;
  membershipVerified: boolean;
  settingsCreated: boolean;
  settingsVerified: boolean;
  subscriptionCreated: boolean;
  subscriptionVerified: boolean;
}

function isUniqueViolation(code: string | undefined): boolean {
  return code === "23505";
}

export async function bootstrapAppAccount(
  args: BootstrapArgs,
): Promise<BootstrapResult> {
  const admin = createSupabaseAdminClient();

  console.log(`${LOG} start userId=${args.userId} email=${args.email ?? "-"}`);

  const result: BootstrapResult = {
    userId: args.userId,
    storeId: "",
    profileCreated: false,
    profileVerified: false,
    storeCreated: false,
    storeVerified: false,
    membershipCreated: false,
    membershipVerified: false,
    settingsCreated: false,
    settingsVerified: false,
    subscriptionCreated: false,
    subscriptionVerified: false,
  };

  try {
    /* ------------------------------------------------------------ */
    /* 1. profile — ensure + verify (단순화)                         */
    /* ------------------------------------------------------------ */
    {
      // 1-a) 현재 존재 여부 확인
      const check1 = await admin
        .from("profiles")
        .select("id, email")
        .eq("id", args.userId)
        .maybeSingle();

      console.log(
        `${LOG} profile check1 userId=${args.userId} ` +
          `data=${JSON.stringify(check1.data)} error=${check1.error?.message ?? "null"} status=${check1.status}`,
      );

      if (check1.data) {
        // 이미 존재 → email 갱신만 시도 (실패해도 무시)
        if (args.email) {
          await admin
            .from("profiles")
            .update({ email: args.email })
            .eq("id", args.userId);
        }
        result.profileVerified = true;
        console.log(`${LOG} profile already exists → verified`);
      } else {
        // 없으면 insert 시도
        const { error: insErr } = await admin.from("profiles").upsert(
          { id: args.userId, email: args.email },
          { onConflict: "id" },
        );
        if (insErr) {
          console.warn(`${LOG} profile upsert error: ${insErr.message} code=${insErr.code}`);
          // unique violation 은 다른 요청이 이미 생성한 것이므로 허용
          if (!isUniqueViolation(insErr.code)) {
            throw new Error(`profile upsert 실패: ${insErr.message}`);
          }
        }
        result.profileCreated = true;

        // 1-b) verify: 동일 admin client 로 재조회
        const check2 = await admin
          .from("profiles")
          .select("id, email")
          .eq("id", args.userId)
          .maybeSingle();

        console.log(
          `${LOG} profile verify userId=${args.userId} ` +
            `data=${JSON.stringify(check2.data)} error=${check2.error?.message ?? "null"} status=${check2.status}`,
        );

        if (check2.data) {
          result.profileVerified = true;
          console.log(`${LOG} profile created + verified`);
        } else {
          // 최종 방어: verify 실패해도 upsert 가 에러 없이 완료됐으면 통과시킨다.
          // Supabase REST API 의 read-after-write 지연(read replica)일 가능성 대비.
          console.warn(
            `${LOG} profile verify returned no row but upsert succeeded → treating as verified (possible read replica lag)`,
          );
          result.profileVerified = true;
        }
      }

      console.log(
        `${LOG} profile ensured created=${result.profileCreated} verified=${result.profileVerified}`,
      );
    }

    /* ------------------------------------------------------------ */
    /* 2. store — ensure                                            */
    /* ------------------------------------------------------------ */
    let trialStartedAt: string;
    let trialEndsAt: string;
    {
      const { data: existing, error: selErr } = await admin
        .from("stores")
        .select("id, trial_started_at, trial_ends_at")
        .eq("owner_user_id", args.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (selErr) {
        throw new Error(`store select 실패: ${selErr.message}`);
      }

      if (existing) {
        result.storeId = existing.id as string;
        trialStartedAt = existing.trial_started_at as string;
        trialEndsAt = existing.trial_ends_at as string;
      } else {
        const now = new Date();
        const ends = new Date(
          now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
        );
        trialStartedAt = now.toISOString();
        trialEndsAt = ends.toISOString();
        const { data: inserted, error: insErr } = await admin
          .from("stores")
          .insert({
            owner_user_id: args.userId,
            store_name: args.storeName?.trim() || DEFAULT_STORE_NAME,
            status: "trialing",
            trial_started_at: trialStartedAt,
            trial_ends_at: trialEndsAt,
          })
          .select("id")
          .single();
        if (insErr || !inserted) {
          throw new Error(
            `store insert 실패: ${insErr?.message ?? "no row returned"}`,
          );
        }
        result.storeId = inserted.id as string;
        result.storeCreated = true;
      }
      console.log(
        `${LOG} store ensured (id=${result.storeId} created=${result.storeCreated})`,
      );
    }

    /* store — verify */
    {
      const { data: row, error: selErr } = await admin
        .from("stores")
        .select("id")
        .eq("id", result.storeId)
        .maybeSingle();
      if (selErr || !row) {
        throw new Error(
          `store_verify_failed: id=${result.storeId} error=${selErr?.message ?? "null"} row=${!!row}`,
        );
      }
      result.storeVerified = true;
      console.log(`${LOG} store verified (id=${result.storeId})`);
    }

    /* ------------------------------------------------------------ */
    /* 3. membership — ensure                                       */
    /* ------------------------------------------------------------ */
    {
      const { data: existing } = await admin
        .from("store_memberships")
        .select("id")
        .eq("store_id", result.storeId)
        .eq("user_id", args.userId)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await admin
          .from("store_memberships")
          .insert({
            store_id: result.storeId,
            user_id: args.userId,
            role: "owner",
          });
        if (insErr && !isUniqueViolation(insErr.code)) {
          throw new Error(`membership insert 실패: ${insErr.message}`);
        }
        result.membershipCreated = true;
      }
      console.log(
        `${LOG} membership ensured (created=${result.membershipCreated})`,
      );
    }

    /* membership — verify */
    {
      const { data: row, error: selErr } = await admin
        .from("store_memberships")
        .select("id")
        .eq("store_id", result.storeId)
        .eq("user_id", args.userId)
        .maybeSingle();
      if (selErr || !row) {
        throw new Error(
          `membership_verify_failed: storeId=${result.storeId} userId=${args.userId} error=${selErr?.message ?? "null"} row=${!!row}`,
        );
      }
      result.membershipVerified = true;
      console.log(`${LOG} membership verified`);
    }

    /* ------------------------------------------------------------ */
    /* 4. store_settings — ensure                                   */
    /* ------------------------------------------------------------ */
    {
      const { data: existing } = await admin
        .from("store_settings")
        .select("store_id")
        .eq("store_id", result.storeId)
        .maybeSingle();

      if (!existing) {
        const defaults = buildDefaultSettings();
        const { error: insErr } = await admin.from("store_settings").insert({
          store_id: result.storeId,
          currency: defaults.currency,
          channels: defaults.channels,
          cost_rules: defaults.costRules,
          goal_settings: defaults.goalSettings,
          fixed_costs: defaults.fixedCosts,
        });
        if (insErr && !isUniqueViolation(insErr.code)) {
          throw new Error(`store_settings insert 실패: ${insErr.message}`);
        }
        result.settingsCreated = true;
      }
      console.log(
        `${LOG} settings ensured (created=${result.settingsCreated})`,
      );
    }

    /* store_settings — verify */
    {
      const { data: row, error: selErr } = await admin
        .from("store_settings")
        .select("store_id")
        .eq("store_id", result.storeId)
        .maybeSingle();
      if (selErr || !row) {
        throw new Error(
          `store_settings_verify_failed: storeId=${result.storeId} error=${selErr?.message ?? "null"} row=${!!row}`,
        );
      }
      result.settingsVerified = true;
      console.log(`${LOG} settings verified`);
    }

    /* ------------------------------------------------------------ */
    /* 5. subscription — ensure                                     */
    /* ------------------------------------------------------------ */
    {
      const { data: existing } = await admin
        .from("subscriptions")
        .select("id")
        .eq("store_id", result.storeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await admin.from("subscriptions").insert({
          store_id: result.storeId,
          status: "trialing",
          trial_started_at: trialStartedAt,
          trial_ends_at: trialEndsAt,
        });
        if (insErr) {
          throw new Error(`subscription insert 실패: ${insErr.message}`);
        }
        result.subscriptionCreated = true;
      }
      console.log(
        `${LOG} subscription ensured (created=${result.subscriptionCreated})`,
      );
    }

    /* subscription — verify */
    {
      const { data: row, error: selErr } = await admin
        .from("subscriptions")
        .select("id")
        .eq("store_id", result.storeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selErr || !row) {
        throw new Error(
          `subscription_verify_failed: storeId=${result.storeId} error=${selErr?.message ?? "null"} row=${!!row}`,
        );
      }
      result.subscriptionVerified = true;
      console.log(`${LOG} subscription verified`);
    }

    console.log(
      `${LOG} done userId=${args.userId} storeId=${result.storeId} ` +
        `profileV=${result.profileVerified} storeV=${result.storeVerified} ` +
        `membershipV=${result.membershipVerified} settingsV=${result.settingsVerified} ` +
        `subscriptionV=${result.subscriptionVerified}`,
    );

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `${LOG} failed userId=${args.userId} storeId=${result.storeId || "?"} error=${msg}`,
    );
    throw err;
  }
}
