# 장사 계산기 (JANGSA)

매출·순이익·수수료 자동 계산 SaaS (MVP).

엑셀 없이 웹에서 **배민 / 요기요 / 쿠팡이츠 / POS** 매출을 입력하고
월별 정산과 KPI를 한눈에 확인하는 관리자형 대시보드입니다.

> **현재 상태 (SaaS 전환 Unit 01 — 과도기)**
> - Supabase 기반 인증 / 7일 무료 체험 / 보호 라우트 뼈대가 들어와 있습니다.
> - `/app/*` 경로가 Supabase 세션을 요구합니다.
> - 그러나 **매출·설정 데이터 자체는 아직 브라우저 IndexedDB(Dexie)** 에 저장됩니다.
>   이 부분은 다음 단계에서 Supabase Postgres 로 이관될 예정입니다.
> - 구버전 경로(`/dashboard`, `/entries` 등)는 `(legacy)` 그룹으로 이동했으며 계속 접근 가능합니다.

## 기술 스택

- [Next.js](https://nextjs.org/) 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui 스타일 공통 컴포넌트
- lucide-react 아이콘
- [Supabase](https://supabase.com/) (Auth + Postgres + RLS) — SaaS 인증/구독 뼈대
- [Dexie](https://dexie.org/) — 로컬 MVP 데이터 저장 (과도기)
- Vitest — 순수 함수 단위 테스트
- Vercel 배포 전제

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
#    → NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 값 채우기

# 3. Supabase migration 적용 (아래 "Supabase 설정" 섹션 참고)

# 4. 개발 서버 실행
npm run dev
```

개발 서버가 뜨면 브라우저에서 <http://localhost:3000> 을 엽니다.
루트 경로 `/` 는 마케팅 랜딩 페이지로 연결됩니다.

- 공개 경로: `/`, `/login`, `/signup`, `/pricing`
- 보호 경로: `/app/dashboard`, `/app/entries`, `/app/settlement`, `/app/settings`, `/app/backup`, `/app/billing`
- 레거시 경로 (로그인 불필요, Dexie 기반): `/dashboard`, `/entries`, `/settlement`, `/settings`, `/backup`

프로덕션 빌드 및 실행:

```bash
npm run build
npm run start
```

사용 가능한 스크립트:

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (Hot reload) |
| `npm run build` | Next.js 프로덕션 빌드 + 타입 검사 |
| `npm run start` | 빌드된 앱 실행 |
| `npm run lint` | Next.js ESLint |
| `npm run typecheck` | TypeScript 타입 검사만 실행 (`tsc --noEmit`) |
| `npm run test` | Vitest 테스트 1회 실행 |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run test:ui` | Vitest UI 브라우저 리포터 |

## Supabase 설정

이 앱의 인증·구독 뼈대는 Supabase 를 기반으로 합니다.
로컬 개발과 배포 모두 아래 준비가 필요합니다.

### 1) 환경변수

`.env.local.example` 을 복사해 `.env.local` 로 만든 뒤 Supabase 프로젝트 값으로 채웁니다.

| 키 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (Public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (브라우저 노출 OK) |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용.** 회원가입 부트스트랩에서만 사용. 절대 클라이언트에 노출 금지 |

Vercel 배포 시에는 **Project Settings → Environment Variables** 에 동일한 3개 키를 등록합니다.
`SUPABASE_SERVICE_ROLE_KEY` 는 Environment 를 `Production` / `Preview` 로만 제한하는 것을 권장합니다.

### 2) DB migration 적용

이번 단계의 최소 테이블과 RLS 정책은 `supabase/migrations/20260412120000_init_saas_core.sql` 에 있습니다.

**Supabase CLI 사용 시:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**또는 SQL Editor 에 직접 붙여넣기:**

1. Supabase 대시보드 → SQL Editor 열기
2. `supabase/migrations/20260412120000_init_saas_core.sql` 전체 내용 복사해 실행

생성되는 테이블: `profiles`, `stores`, `store_memberships`, `store_settings`, `subscriptions`.
모두 RLS 가 활성화되며 기본 정책은 "자기 데이터만" 수준입니다.

### 3) Auth 설정 (권장)

Supabase 대시보드 → **Authentication → Providers** 에서 **Email** 을 활성화합니다.
현재 단계에서는 이메일 + 비밀번호 로그인만 사용합니다 (OAuth / 매직링크는 다음 단계).

- "Confirm email" 옵션을 **끄면** 가입 즉시 /app/dashboard 로 이동합니다.
- **켜면** 가입 직후 /login?signup=pending 으로 이동하며 메일 확인 후 로그인할 수 있습니다.

### 4) 회원가입 / 로그인 흐름

1. 사용자가 `/signup` 에서 이메일·비밀번호 입력
2. Supabase Auth `signUp` 호출
3. 성공 시 서버 action 이 `bootstrapAppAccount(userId)` 를 호출해
   `profiles` / `stores` / `store_memberships` / `store_settings` / `subscriptions` 를 자동 생성
4. `stores.status = 'trialing'`, `trial_ends_at = now() + 7 days`
5. 세션이 있으면 `/app/dashboard` 로, 없으면 `/login?signup=pending` 으로 이동

`bootstrapAppAccount` 는 **idempotent** 합니다. 동일 사용자에 대해 여러 번 호출되어도 기존 데이터가 있으면
재사용만 하고 실패하지 않습니다. `/app` 레이아웃에서 `requireStoreContext()` 가 membership 을
찾지 못하면 자동으로 bootstrap 을 한 번 더 시도합니다.

### 7일 무료 체험 정책

- 가입 시점에 `stores.trial_started_at` 과 `stores.trial_ends_at` 이 기록됩니다.
- `lib/auth/access.ts` 의 `getAccessStatusFromStore` 가 현재 시각과 `trial_ends_at` 을 비교해
  `trialing` / `expired` 등을 파생합니다.
- 앱 상단 `TrialBanner` 가 "무료 체험 N일 남음" / "무료 체험 종료" 등을 표시합니다.
- 결제 연동은 **다음 단계**에서 붙습니다. 이번 단계에서는 `/app/billing` 이 상태 표시 + 가격 안내만 합니다.

### 과도기 주의사항

- `/app/*` 아래 페이지들이 참조하는 **매출 데이터·설정**은 여전히 브라우저 IndexedDB 에 저장됩니다.
- 즉, 로그인은 Supabase 에서 관리되지만 "내가 입력한 매출" 은 **기기마다 다릅니다**.
- 이 부분은 다음 단계에서 `store_settings` + 신규 `entries` 테이블로 이관할 예정입니다.
- 현재는 로컬에 입력한 데이터가 중요하다면 `/app/backup` (또는 `/backup`) 에서 JSON 내보내기로 보관하세요.

## 테스트

순수 계산 로직 및 데이터 검증 로직에 대한 단위 테스트가 `tests/` 에 있습니다.

```bash
npm run test
```

현재 테스트 커버리지:

- `tests/calc.test.ts` — 일별/월별 계산, BEP, MoM, 목표 달성률, NaN/음수/Infinity 방어
- `tests/import-validation.test.ts` — JSON 백업 파싱, 손상된 entry 필터링, 부분 settings 복원
- `tests/csv.test.ts` — CSV escape, 헤더/행 구조, 월 필터링, 정렬

**커버하지 않는 부분** (수동 테스트 체크리스트 참고):
- IndexedDB/Dexie 저장 동작
- React 컴포넌트 렌더링
- 파일 입출력 (`File.text()`, `URL.createObjectURL`)
- Provider 의 상태 동기화

## 주요 라우트

| 경로 | 설명 |
| --- | --- |
| `/dashboard` | 월별 KPI·차트·요약 대시보드 |
| `/entries` | 일자별 채널 매출 입력 |
| `/settlement` | 월별 정산 요약 및 일별 정산표 |
| `/settings` | 채널 수수료 / 원가 / 목표 · 고정비 설정 |
| `/backup` | JSON·CSV 백업/복원, 샘플 데이터, 초기화 |

## 폴더 구조

```
middleware.ts                         # /app/* 보호 + /login /signup 리다이렉트
app/
  layout.tsx                          # 최소 HTML 쉘 (AppShell 미포함)
  globals.css
  (marketing)/                        # 공개 영역
    layout.tsx
    page.tsx                          # 랜딩
    login/page.tsx
    signup/page.tsx
    pricing/page.tsx
    auth-actions.ts                   # login/signup server action
  (legacy)/                           # 로컬 Dexie 경로 (과도기, 인증 불필요)
    layout.tsx                        # AppShell + AppStateProvider
    dashboard/page.tsx
    entries/page.tsx
    settlement/page.tsx
    settings/page.tsx
    backup/page.tsx
  (protected)/
    app/
      layout.tsx                      # requireStoreContext + AppShell + TrialBanner
      dashboard/page.tsx              # → (legacy) 재사용
      entries/page.tsx                # → (legacy) 재사용
      settlement/page.tsx             # → (legacy) 재사용
      settings/page.tsx               # → (legacy) 재사용
      backup/page.tsx                 # → (legacy) 재사용
      billing/page.tsx                # 체험/결제 상태 placeholder
  auth/
    callback/route.ts                 # Supabase 콜백
    signout/route.ts                  # POST 로그아웃
components/
  layout/ (app-shell / sidebar / topbar)
  common/ (page-header / section-card / month-picker / kpi-card / empty-state / entries-debug-badge)
  auth/
    login-form.tsx                    # useFormState + server action
    signup-form.tsx
    trial-banner.tsx                  # trial / expired 상태 배너
    user-menu.tsx                     # 우상단 매장명 + 로그아웃
  settings/ (settings-form / settings-number-field)
  entries/ (entries-editor / entries-table-row)
  settlement/ (daily-settlement-table)
  providers/
    app-state-provider.tsx            # Dexie 기반 (로컬) — 과도기 유지
hooks/ (useAppState / useSettings / useEntries / useComputedMetrics)
lib/
  supabase/
    client.ts                         # 브라우저 Supabase client
    server.ts                         # 서버 컴포넌트/액션 client
    admin.ts                          # service role client (bootstrap 전용)
    middleware.ts                     # updateSession()
  auth/
    types.ts                          # AccessStatus / StoreRow / StoreContext 등
    access.ts                         # getAccessStatusFromStore / isWriteAllowed / getTrialDaysRemaining
    bootstrap.ts                      # bootstrapAppAccount (idempotent)
    guards.ts                         # requireUser / requireStoreContext
  db/dexie.ts                         # Dexie (로컬) — 과도기 유지
  constants/ (channels / defaults)
  calc/ (helpers / daily / monthly / index)
  utils/ (cn / currency / date / default-state / sample-data
          / download / backup / csv / import-validation / backup-restore)
supabase/
  migrations/
    20260412120000_init_saas_core.sql # profiles / stores / memberships / settings / subscriptions + RLS
tests/
  calc.test.ts
  import-validation.test.ts
  csv.test.ts
types/
  index.ts                            # 로컬 Dexie 쪽 타입 (AppSettings / DailyEntry 등)
```

## 데이터 모델 (Unit 02 기준)

```ts
type ChannelKey = "baemin" | "yogiyo" | "coupang" | "pos";

interface ChannelSettings { label: string; enabled: boolean; feeRate: number }
interface CostSettings    { ingredientCostRate: number; packagingCostRate: number }
interface GoalSettings    { salesTarget: number }
interface FixedCosts      { rent: number; labor: number; utilities: number; marketing: number; misc: number }

interface AppSettings {
  channels: Record<ChannelKey, ChannelSettings>;
  costRules: CostSettings;
  goalSettings: GoalSettings;
  fixedCosts: FixedCosts;
  currency: string;
}

interface DailyEntry {
  id: string;
  date: string;   // YYYY-MM-DD
  month: string;  // YYYY-MM (조회 최적화용)
  sales: Record<ChannelKey, number>;
  refundAmount: number;
  dailyAdCost: number;
  extraVariableCost: number;
  memo?: string;
  createdAt: number;
  updatedAt: number;
}
```

## Dexie 스키마

데이터베이스 이름: `jangsa-db` (버전 1)

| 테이블 | 키/인덱스 | 설명 |
| --- | --- | --- |
| `settings` | `&key` | 단일 행 (`key: "app-settings"`, `value: AppSettings`) |
| `entries`  | `&id, date, month` | 일별 매출. `month` 인덱스로 월별 조회 최적화 |
| `meta`     | `&key` | `key: "app-meta"`, 앱 버전/초기화 시각 |

인스턴스는 `lib/db/dexie.ts`의 `getDb()`로 lazy-init. 브라우저에서만 호출해야 합니다(SSR에서는 에러를 던집니다).

## 전역 상태 Provider

`components/providers/app-state-provider.tsx` 의 `AppStateProvider` 가 `app/layout.tsx` 최상단에서 앱 전체를 감쌉니다.

Provider가 보관하는 것:
- `settings: AppSettings | null` (IndexedDB의 캐시)
- `entries: DailyEntry[]` (IndexedDB의 캐시, `date` 오름차순)
- `loading`, `error`

Provider가 제공하는 함수:
- `updateSettings(patch)` — 최상위 키 기준 얕은 병합 저장
- `getEntriesByMonth(month)` — 메모리상 필터 (O(n))
- `upsertEntry(entry)` / `upsertEntries(list)`
- `deleteEntry(id)` / `clearEntries()`
- `seedSampleData(month?)` — 샘플 엔트리 주입
- `resetAllData()` — 모든 테이블 초기화 후 기본값 재주입

> **원칙:** Provider는 *원본 데이터만* 보관하고, 파생/집계/계산은 들지 않습니다. 계산 엔진은 Unit 03에서 별도 모듈로 도입합니다.

### 훅
- `useAppState()` — Provider 값 전체
- `useSettings()` — `{ settings, loading, error, updateSettings }`
- `useEntries()` — `{ entries, loading, getEntriesByMonth, upsertEntry, upsertEntries, deleteEntry, clearEntries }`

### 엔트리 저장 정책
- **기본 키는 `id`(문자열)** 입니다. `upsertEntry` / `upsertEntries` 는 id 기준으로 덮어씁니다.
- `date`(YYYY-MM-DD), `month`(YYYY-MM)는 조회 인덱스입니다.
- "하루에 하나만 유지"를 원할 때는 호출부에서 **`id = date` 규칙**을 적용하세요. 그러면 같은 날짜 업서트가 자동으로 덮어쓰기됩니다. (샘플 데이터 생성기도 `id = "sample-${date}"` 규칙을 사용합니다.)

## 기본값 (Unit 02)

`lib/constants/defaults.ts`:

| 항목 | 값 |
| --- | --- |
| 배민 수수료율 | 6.8% |
| 요기요 수수료율 | 12.5% |
| 쿠팡이츠 수수료율 | 9.8% |
| POS 수수료율 | 0% |
| 식자재 원가율 | 35% |
| 포장비율 | 2% |
| 월 목표 매출 | 30,000,000원 |
| 월세 | 2,000,000원 |
| 인건비 | 2,500,000원 |
| 공과금 | 300,000원 |
| 마케팅 | 200,000원 |
| 기타 고정비 | 0원 |

이 값은 앱 최초 진입 시 `settings` 테이블이 비어 있으면 자동으로 주입되고,
이후에는 `useSettings().updateSettings()`로 덮어씁니다.

## 계산 엔진 (Unit 03)

`lib/calc/` 는 React / Dexie / DOM 에 의존하지 않는 **순수 함수** 모음입니다.
입력값이 `null` / `undefined` / `NaN` / `Infinity` / 음수여도 0 기반으로 안전하게
수렴하도록 설계되어 있습니다. 포맷팅은 하지 않고 원시 `number` 만 반환합니다.

### 파일 구성

- `lib/calc/helpers.ts` — `toSafeNumber`, `clampMinZero`, `percentToRatio`, `roundCurrency`, `safeDivide`
- `lib/calc/daily.ts` — 일별 지표
- `lib/calc/monthly.ts` — 월별 집계, BEP, MoM, 최고 매출일, 오늘/이번달 스냅샷
- `lib/calc/index.ts` — barrel export

### 일별 계산 규칙 (`computeDailyMetrics`)

| 항목 | 계산식 |
| --- | --- |
| `grossSales` | `sum(sales.baemin, yogiyo, coupang, pos)` — 음수 입력은 0 처리 |
| `netSales` | `max(0, grossSales - refundAmount)` |
| `channelFees[ch]` | `channelSales[ch] * feeRate[ch] / 100` (음수 rate 는 0) |
| `totalChannelFee` | `sum(channelFees)` |
| `ingredientCost` | `netSales * ingredientCostRate / 100` |
| `packagingCost` | `netSales * packagingCostRate / 100` |
| `totalVariableCost` | `totalChannelFee + ingredientCost + packagingCost + dailyAdCost + extraVariableCost` |
| `operatingProfitBeforeFixed` | `netSales - totalVariableCost` (음수 가능) |

### 월별 계산 규칙 (`computeMonthlyMetrics`)

월 entries 는 내부에서 `getEntriesForMonth(entries, month)` 로 필터합니다.

| 항목 | 설명 |
| --- | --- |
| `grossSales`, `netSales` | 해당 월 daily 합 |
| `totalChannelFee`, `totalIngredientCost`, `totalPackagingCost`, `totalAdCost`, `totalExtraVariableCost`, `totalVariableCost` | daily 합 |
| `operatingProfitBeforeFixed` | daily 합 |
| `totalFixedCost` | `settings.fixedCosts` 5개 항목 합 (항목별 음수 방어) |
| `finalNetProfit` | `operatingProfitBeforeFixed - totalFixedCost` (음수 가능) |
| `targetSales` | `settings.goalSettings.salesTarget` (음수 방어) |
| `targetAchievementRate` | `grossSales / targetSales * 100` (target ≤ 0 → 0) |
| `bestSalesDate`, `bestSalesAmount` | 월 중 `grossSales` 최대값 날짜. 데이터 없으면 `null` / 0 |
| `contributionMargin` | `netSales - totalVariableCost` |
| `contributionMarginRate` | `contributionMargin / netSales` (netSales ≤ 0 → 0) |
| `bepSales` | `totalFixedCost / contributionMarginRate` (CM rate ≤ 0 → `null`) |
| `channelSales`, `channelFees` | 채널별 월 합 |
| `channelSalesShare` | 채널별 매출 비중 (0..1 ratio, 총매출 0 → 모두 0) |
| `monthOverMonthGrowthRate` | `((curr - prev) / prev) * 100` (prev ≤ 0 → 0) |

### 핵심 함수 목록

```ts
// 일별
createEmptyDailyMetrics(date, month)
computeDailyMetrics(entry, settings)
computeDailyMetricsList(entries, settings)

// 월별 / 집계
getEntriesForMonth(entries, month)
getPreviousMonthKey(month)
ensureMonthKey(value)
isSameMonth(date, month)

summarizeChannelSales(entries)
summarizeChannelFees(entries, settings)
computeFixedCostTotal(settings)

computeTargetAchievementRate(grossSales, targetSales)
computeBepSales(netSales, totalVariableCost, totalFixedCost)
computeMonthOverMonthGrowthRate(currentGrossSales, previousGrossSales)

getBestSalesDay(entries, settings, month)
computeMonthlyMetrics(entries, settings, month, previousMonthEntries?)

// 오늘 / 현재 달 스냅샷
getTodayMetrics(entries, settings, today?)
getCurrentMonthMetrics(entries, settings, today?)

// 숫자 헬퍼
toSafeNumber, clampMinZero, percentToRatio, roundCurrency, safeDivide
```

### 사용 예

```ts
// 순수 함수로 바로 호출
import { computeMonthlyMetrics, getCurrentMonthMetrics } from "@/lib/calc";

const summary = computeMonthlyMetrics(entries, settings, "2026-04");
console.log(summary.finalNetProfit, summary.bepSales);
```

```tsx
// React 컴포넌트에서 훅으로 사용
"use client";
import { useComputedMetrics } from "@/hooks/useComputedMetrics";

function Example() {
  const { getCurrentMonthSnapshot } = useComputedMetrics();
  const monthly = getCurrentMonthSnapshot();
  return <span>{monthly.grossSales}</span>;
}
```

## 백업 / 복원 / CSV

`app/backup/page.tsx` 에서 5가지 기능이 실제 동작합니다.

| 기능 | 설명 | 관련 파일 |
| --- | --- | --- |
| JSON 내보내기 | 앱 전체 상태를 `jangsa-backup-YYYY-MM-DD-HHmmss.json` 로 다운로드 | `lib/utils/backup.ts`, `lib/utils/download.ts` |
| JSON 복원 | 파일 선택 즉시 사전 검증 → 사용자 확인 → 스냅샷 캡처 → 적용(실패 시 롤백) | `lib/utils/import-validation.ts`, `lib/utils/backup-restore.ts` |
| 월별 CSV 내보내기 | 선택 월 기준 일별 정산표 CSV (UTF-8 BOM, CRLF) | `lib/utils/csv.ts` |
| 샘플 데이터 주입 | 선택 월에 재현 가능한 샘플 엔트리 주입 (`seedSampleData(month)`) | Provider 기존 함수 재사용 |
| 전체 초기화 | 2단계 confirm → `resetAllData` | Provider 기존 함수 재사용 |

### JSON 백업 파일 포맷

```json
{
  "version": 1,
  "exportedAt": "2026-04-12T10:23:45.123Z",
  "settings": { ... },
  "entries": [ ... ]
}
```

### ⚠️ 백업 / 복원 주의사항

- **JSON 복원은 현재 브라우저에 저장된 모든 설정·입력 데이터를 덮어씁니다.**
- 복원 전에는 반드시 "JSON 내보내기" 로 **먼저 백업 파일을 만들어 두세요.**
- 파일을 선택하면 즉시 사전 검증이 실행되고, 유효 건수·제외 건수를 먼저 확인할 수 있습니다. 이 단계까지는 DB가 변경되지 않습니다.
- 적용 버튼 클릭 시 메모리상 이전 상태를 스냅샷으로 캡처한 뒤 `resetAllData → updateSettings → upsertEntries` 순으로 적용합니다.
- 적용 중 오류가 발생하면 **best-effort 로 이전 상태 복구를 시도**합니다. 복구 결과(성공/롤백/롤백 실패)가 상태 메시지에 명확히 표시됩니다.
- 최소 필수 필드(`id`, `date`)가 없거나 날짜 포맷이 잘못된 entry 는 자동으로 제외되며, 제외 건수가 성공 메시지에 포함됩니다.
- 한 번에 하나의 작업만 실행되며, 작업 중에는 다른 파괴적 버튼(초기화·복원 등)이 자동으로 잠깁니다.
- 설정 화면이 열려 있는 상태에서 복원이 일어나면, 설정 화면에 "외부에서 변경됨" 배너가 나타납니다. 편집 중이 아니면 자동 동기화되고, 편집 중이면 사용자가 "최신 저장값 불러오기" 를 직접 선택할 수 있습니다.

## 수동 테스트 체크리스트

### 핵심 흐름

- [ ] **설정 변경 → 대시보드 반영**: `/settings` 에서 수수료율/고정비를 바꾸고 저장 → `/dashboard` 의 수수료·순이익·BEP 값이 즉시 반영되는지 확인
- [ ] **매출 입력 → 정산 반영**: `/entries` 에서 특정 날짜 셀 편집 → `/settlement` 의 일별 정산표와 월 요약 카드에 즉시 반영되는지 확인
- [ ] **샘플 데이터 주입**: `/backup` 에서 "선택 월 샘플 데이터 넣기" 클릭 → `/dashboard`, `/settlement`, `/entries` 모두에 해당 월 데이터가 반영되는지 확인
- [ ] **전체 초기화**: 2단계 confirm 통과 → entries 가 비고 settings 가 기본값으로 복귀하는지 확인
- [ ] **JSON export → JSON import 라운드트립**: 현재 상태를 내보내기 → 값을 수정 → 방금 받은 파일을 다시 import → 원상태로 복원되는지 확인
- [ ] **새로고침 내구성**: 각 작업 후 F5 를 눌러도 동일 상태가 유지되는지 확인

### 안전성 / 에러 케이스

- [ ] **잘못된 JSON 차단**: JSON 포맷이 깨진 파일을 선택하면 "파일 검증 실패" 배너만 보이고 복원 버튼이 비활성 유지되는지 확인
- [ ] **부분 손상된 entries**: `id`/`date` 가 빠진 항목이 섞인 JSON 을 import → 유효한 것만 복원되고 성공 메시지에 "제외된 항목 N건" 이 나오는지 확인
- [ ] **settings 필드 누락**: `channels` 등이 없는 JSON 을 import → `BackupImportError` 와 함께 차단되는지 확인
- [ ] **복원 실패 시 롤백**: (개발자 모드에서 `performRestoreWithRollback` 내부에 의도적 throw 추가로 검증) → 오류 메시지가 "이전 상태를 복구했습니다" 로 끝나는지 확인
- [ ] **외부 변경 감지**: `/settings` 를 열어둔 상태에서 다른 탭 또는 백업 화면에서 복원/초기화 실행 → 설정 화면 상단에 노란색 "외부에서 변경됨" 배너가 나타나는지 확인
- [ ] **외부 변경 + 편집 중**: 설정 화면에서 값 편집 중인 상태로 복원 발생 → draft 가 덮어써지지 않고 배너만 나타나며, "최신 저장값 불러오기" 버튼을 누를 때만 반영되는지 확인
- [ ] **동시 작업 차단**: 백업 화면에서 한 작업이 진행 중일 때 다른 버튼(특히 전체 초기화)이 disabled 되는지 확인

## 배포 시 주의사항

이 앱은 **100% 클라이언트 로컬 저장 앱** 입니다. 서버 측 데이터베이스도, 사용자 계정도 없습니다.

- **모든 데이터는 사용자의 브라우저(IndexedDB)에 저장됩니다.** 앱을 다른 기기 / 다른 브라우저 / 시크릿 모드에서 열면 **자동 동기화되지 않습니다.**
- 기기 변경, 브라우저 교체, 시크릿 창, 쿠키/사이트 데이터 초기화 → **모든 입력 데이터가 사라집니다.**
- 실사용 환경에서는 주기적으로 `/backup` 페이지의 **"JSON 내보내기"** 로 스냅샷 파일을 만들어 두는 것을 강력히 권장합니다.
- **SSR / API route / 서버 저장 없음** — `next start` 로 기동되긴 하지만 서버는 정적 페이지만 서빙하며, 데이터는 브라우저에만 있습니다. 따라서 `next export` 로 정적 호스팅(Cloudflare Pages, Netlify, GitHub Pages 등)에도 그대로 배포 가능합니다.
- **환경변수는 현재 필요 없습니다.** 빌드 시 `NEXT_PUBLIC_*` 이나 DB 연결 문자열 등이 일절 필요 없습니다.
- 사용자 브라우저에서 JavaScript 가 비활성화되어 있으면 동작하지 않습니다 (계산·저장이 모두 클라이언트).

### 배포 전 체크리스트

**기본 기능**

- [ ] `/` 접근 시 `/dashboard` 로 리다이렉트
- [ ] `/settings` 에서 설정 변경 후 저장 → 정상 저장 메시지
- [ ] `/entries` 에서 매출 입력 → 즉시 저장
- [ ] `/dashboard` / `/settlement` 가 입력·설정 변경을 즉시 반영
- [ ] `/backup` 에서 JSON 내보내기 → 파일 다운로드
- [ ] `/backup` 에서 JSON 복원 → 사전 검증 → 확인 → 정상 복원
- [ ] `/backup` 에서 CSV 내보내기 → 엑셀에서 한글 깨짐 없음
- [ ] 샘플 데이터 주입 → 대시보드/정산에 반영
- [ ] 전체 초기화 → 기본값으로 복귀
- [ ] 새로고침 후 모든 상태 유지

**안전성**

- [ ] 잘못된 JSON 파일 선택 시 "파일 검증 실패" 배너만 보이고 복원 버튼 비활성
- [ ] 부분 손상된 entries 가 섞인 JSON → 유효 건수/제외 건수가 메시지에 표기
- [ ] JSON import 중 오류 발생 시 "이전 상태 복구를 시도했습니다" 메시지
- [ ] `/settings` 를 연 채 복원 / 초기화 → 외부 변경 배너 등장, draft 손실 없음
- [ ] 한 작업 진행 중 다른 파괴적 버튼이 disabled

**빌드 / 배포**

- [ ] `npm run typecheck` 통과 (에러 0)
- [ ] `npm run test` 통과 (41개 모두 green)
- [ ] `npm run build` 성공
- [ ] 환경변수 없이도 정적 빌드가 완성됨
- [ ] `metadata` (title, description) 한국어로 세팅되어 있음 — `app/layout.tsx`
- [ ] 로고/아이콘 자산이 필요하면 `public/` 확인 (현재는 별도 자산 없음)

## 지원 범위 / 미지원

### 지원
- 월별 매출 입력 (배민/요기요/쿠팡이츠/POS + 환불/광고비/기타변동비/메모)
- 일별 자동 계산 (총매출·수수료·원가·포장비·순이익)
- 월별 집계 (KPI, BEP, MoM, 최고 매출일, 채널 비중)
- 설정 편집 (수수료율·원가율·목표·고정비) + 외부 변경 감지
- JSON 전체 백업/복원 (사전 검증·스냅샷 롤백)
- 월별 CSV 내보내기 (엑셀 한글 호환)
- 샘플 데이터 주입 · 전체 초기화
- 100% 로컬 저장 (IndexedDB), 새로고침 내구성

### 미지원 (현재 범위 밖)
- 로그인 / 멀티 계정 / 클라우드 동기화
- 차트 (Recharts 등 시각화)
- CSV import
- 다국어 / 다중 통화
- PWA / 오프라인 앱
- 모바일 전용 카드 레이아웃 (현재는 가로 스크롤로 대응)
- 실시간 다른 탭 동기화 (BroadcastChannel)

## 향후 개선 아이디어

1. **대시보드 차트** — Recharts 로 일자별 매출 라인, 채널별 도넛, 월 KPI 스파크라인
2. **엔트리 일괄 입력 편의** — 전일 복사, 지난주 같은 요일 복사, 셀 범위 채우기
3. **PWA / 오프라인** — manifest + 서비스 워커 (IndexedDB 기반이라 궁합이 좋음)
4. **자동 백업 스냅샷** — 복원 직전 스냅샷을 `meta` 테이블에 1회분 보관
5. **다중 탭 동기화** — BroadcastChannel 로 다른 탭에 변경 알림
6. **i18n 준비** — 한국어 문자열을 `lib/i18n/ko.ts` 로 추출
7. **설정 QoL** — 저장 후 scrollTo(top), Ctrl+S 단축키, diff 하이라이트
8. **CSV import** — 외부 스프레드시트에서 일괄 입력

## 구현 히스토리

### 로컬 MVP 단계 (Unit 01–09)
- Unit 01 — 프로젝트 골격 / 레이아웃
- Unit 02 — Dexie / Provider / 훅
- Unit 03 — 순수 계산 엔진 (`lib/calc/*`)
- Unit 04 — MonthPicker · Dashboard · Settlement 실데이터 연결
- Unit 05 — 매출 입력 편집 (월 전체 행 + 즉시 저장)
- Unit 06 — 설정 편집 폼
- Unit 07 — 백업 / 복원 / CSV / 샘플 / 초기화
- Unit 08 — 복원 안전화: 사전 검증 + 스냅샷 롤백, SettingsForm 외부 변경 감지, 백업 페이지 작업 잠금(`isBusy`)
- Unit 09 — 최종 마감: Vitest 41건, 빌드/타입 안정화, a11y 속성 보강, 배포 체크리스트

### SaaS 전환 단계
- **SaaS Unit 01** — **Supabase + Vercel 뼈대**
  - Supabase client/server/admin/middleware 유틸 (`lib/supabase/*`)
  - 전역 `middleware.ts` 로 `/app/*` 보호 + `/login /signup` 리다이렉트
  - 이메일 + 비밀번호 회원가입 / 로그인 / 로그아웃 (server action)
  - 가입 직후 `bootstrapAppAccount` 로 profile / store / membership / store_settings / subscription(trialing) 자동 생성
  - 7일 무료 체험 정책 + `AccessStatus` 모델 + `TrialBanner`
  - 라우트 3분할: `(marketing)` · `(legacy)` · `(protected)/app`
  - 최소 RLS 정책 (profiles / stores / memberships / store_settings / subscriptions)
  - `/app/billing` placeholder (가격 안내 + 결제 준비 중 표시)

## 개발 규칙

- 모든 UI는 한국어.
- `any` 사용 금지. 타입은 `types/`에 정의하고 재사용.
- 페이지 컴포넌트에 UI를 몰아넣지 않고 `components/` 로 분리.
- 원본 데이터와 계산 로직은 분리 (Provider는 원본만).
- Dexie는 `getDb()`로 브라우저에서만 접근.
