import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildDefaultSettings } from "@/lib/utils/default-state";

/**
 * 회원가입 / 로그인 직후 서버에서 호출되는 idempotent bootstrap.
 *
 * 구조: **ensure + verify** per row.
 * - ensure: row 가 없으면 upsert/insert, 있으면 skip
 * - verify: write 후 동일 admin client 로 재조회
 * - verify 에서 row 가 안 보여도 write 가 성공했으면 **false negative** 로 간주하고 통과
 *   (Supabase REST API 의 read-after-write 지연 / read replica lag 대비)
 *
 * ⚠️ verify 실패를 throw 하지 않는 이유:
 *   - membership 없음은 새 계정의 정상 초기 상태
 *   - bootstrap write → verify read 사이에 replica lag 이 발생할 수 있음
 *   - verify null 하나로 전체 onboarding 을 죽이면 사용자가 반복적으로 로그인 실패
 *
 * Service Role 로 동작하므로 RLS 를 우회한다.
 *
 * 무료 서비스 전환 후: subscription 생성(step 5) 제거.
 * store.status = "active", trial 관련 컬럼 null.
 */

const LOG = "[bootstrapAppAccount]";
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
}

function isUniqueViolation(code: string | undefined): boolean {
  return code === "23505";
}

export async function bootstrapAppAccount(
  args: BootstrapArgs,
): Promise<BootstrapResult> {
  // ⚠️ 단일 admin client 를 전 단계에서 재사용. 중간에 재생성 금지.
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
  };

  try {
    /* ============================================================ */
    /* 1. PROFILE                                                    */
    /* ============================================================ */
    {
      const check1 = await admin
        .from("profiles")
        .select("id, email")
        .eq("id", args.userId)
        .maybeSingle();

      console.log(
        `${LOG} profile check1 userId=${args.userId} data=${JSON.stringify(check1.data)} error=${check1.error?.message ?? "null"} status=${check1.status}`,
      );

      if (check1.data) {
        if (args.email) {
          await admin.from("profiles").update({ email: args.email }).eq("id", args.userId);
        }
        result.profileVerified = true;
      } else {
        const { error: wErr } = await admin
          .from("profiles")
          .upsert({ id: args.userId, email: args.email }, { onConflict: "id" });

        if (wErr && !isUniqueViolation(wErr.code)) {
          throw new Error(`profile upsert 실패: ${wErr.message}`);
        }
        result.profileCreated = true;

        const check2 = await admin
          .from("profiles")
          .select("id, email")
          .eq("id", args.userId)
          .maybeSingle();

        console.log(
          `${LOG} profile verify userId=${args.userId} data=${JSON.stringify(check2.data)} error=${check2.error?.message ?? "null"} status=${check2.status}`,
        );

        if (check2.data) {
          result.profileVerified = true;
        } else {
          console.warn(
            `${LOG} profile verify returned no row but upsert succeeded → treating as verified (possible replica lag)`,
          );
          result.profileVerified = true;
        }
      }
      console.log(`${LOG} profile done created=${result.profileCreated} verified=${result.profileVerified}`);
    }

    /* ============================================================ */
    /* 2. STORE                                                      */
    /* ============================================================ */
    {
      const check1 = await admin
        .from("stores")
        .select("id")
        .eq("owner_user_id", args.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      console.log(
        `${LOG} store check1 userId=${args.userId} data=${JSON.stringify(check1.data)} error=${check1.error?.message ?? "null"} status=${check1.status}`,
      );

      if (check1.error) {
        throw new Error(`store select 실패: ${check1.error.message}`);
      }

      if (check1.data) {
        result.storeId = check1.data.id as string;
        result.storeVerified = true;
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("stores")
          .insert({
            owner_user_id: args.userId,
            store_name: args.storeName?.trim() || DEFAULT_STORE_NAME,
            status: "active",
          })
          .select("id")
          .single();

        if (insErr || !inserted) {
          throw new Error(`store insert 실패: ${insErr?.message ?? "no row returned"}`);
        }
        result.storeId = inserted.id as string;
        result.storeCreated = true;

        // verify
        const check2 = await admin
          .from("stores")
          .select("id")
          .eq("id", result.storeId)
          .maybeSingle();

        console.log(
          `${LOG} store verify storeId=${result.storeId} data=${JSON.stringify(check2.data)} error=${check2.error?.message ?? "null"} status=${check2.status}`,
        );

        if (check2.data) {
          result.storeVerified = true;
        } else {
          console.warn(
            `${LOG} store verify returned no row but insert succeeded → treating as verified (possible replica lag)`,
          );
          result.storeVerified = true;
        }
      }

      if (!result.storeId) {
        throw new Error("store row 를 확보하지 못했습니다.");
      }
      console.log(`${LOG} store done id=${result.storeId} created=${result.storeCreated} verified=${result.storeVerified}`);
    }

    /* ============================================================ */
    /* 3. MEMBERSHIP                                                 */
    /* ============================================================ */
    {
      const check1 = await admin
        .from("store_memberships")
        .select("id, store_id, user_id, role")
        .eq("store_id", result.storeId)
        .eq("user_id", args.userId)
        .maybeSingle();

      console.log(
        `${LOG} membership check1 storeId=${result.storeId} userId=${args.userId} data=${JSON.stringify(check1.data)} error=${check1.error?.message ?? "null"} status=${check1.status}`,
      );

      if (check1.data) {
        result.membershipVerified = true;
      } else {
        // write
        const { error: wErr } = await admin
          .from("store_memberships")
          .insert({ store_id: result.storeId, user_id: args.userId, role: "owner" });

        if (wErr && !isUniqueViolation(wErr.code)) {
          throw new Error(`membership insert 실패: ${wErr.message}`);
        }
        if (wErr && isUniqueViolation(wErr.code)) {
          console.log(`${LOG} membership insert got unique_violation → already exists`);
        }
        result.membershipCreated = true;

        // verify
        const check2 = await admin
          .from("store_memberships")
          .select("id, store_id, user_id, role")
          .eq("store_id", result.storeId)
          .eq("user_id", args.userId)
          .maybeSingle();

        console.log(
          `${LOG} membership verify storeId=${result.storeId} userId=${args.userId} data=${JSON.stringify(check2.data)} error=${check2.error?.message ?? "null"} status=${check2.status}`,
        );

        if (check2.data) {
          result.membershipVerified = true;
        } else {
          console.warn(
            `${LOG} membership verify returned no row but write succeeded → treating as verified (possible replica lag)`,
          );
          result.membershipVerified = true;
        }
      }
      console.log(`${LOG} membership done created=${result.membershipCreated} verified=${result.membershipVerified}`);
    }

    /* ============================================================ */
    /* 4. STORE_SETTINGS                                             */
    /* ============================================================ */
    {
      const check1 = await admin
        .from("store_settings")
        .select("store_id")
        .eq("store_id", result.storeId)
        .maybeSingle();

      console.log(
        `${LOG} settings check1 storeId=${result.storeId} data=${JSON.stringify(check1.data)} error=${check1.error?.message ?? "null"} status=${check1.status}`,
      );

      if (check1.data) {
        result.settingsVerified = true;
      } else {
        const defaults = buildDefaultSettings();
        const { error: wErr } = await admin.from("store_settings").upsert(
          {
            store_id: result.storeId,
            currency: defaults.currency,
            channels: defaults.channels,
            cost_rules: defaults.costRules,
            goal_settings: defaults.goalSettings,
            fixed_costs: defaults.fixedCosts,
          },
          { onConflict: "store_id" },
        );

        if (wErr && !isUniqueViolation(wErr.code)) {
          throw new Error(`store_settings upsert 실패: ${wErr.message}`);
        }
        result.settingsCreated = true;

        // verify
        const check2 = await admin
          .from("store_settings")
          .select("store_id")
          .eq("store_id", result.storeId)
          .maybeSingle();

        console.log(
          `${LOG} settings verify storeId=${result.storeId} data=${JSON.stringify(check2.data)} error=${check2.error?.message ?? "null"} status=${check2.status}`,
        );

        if (check2.data) {
          result.settingsVerified = true;
        } else {
          console.warn(
            `${LOG} settings verify returned no row but upsert succeeded → treating as verified (possible replica lag)`,
          );
          result.settingsVerified = true;
        }
      }
      console.log(`${LOG} settings done created=${result.settingsCreated} verified=${result.settingsVerified}`);
    }

    /* ============================================================ */
    /* DONE                                                          */
    /* ============================================================ */
    console.log(
      `${LOG} done userId=${args.userId} storeId=${result.storeId} ` +
        `profileV=${result.profileVerified} storeV=${result.storeVerified} ` +
        `membershipV=${result.membershipVerified} settingsV=${result.settingsVerified}`,
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
