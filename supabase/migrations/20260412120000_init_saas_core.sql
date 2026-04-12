-- ============================================================
-- 장사 계산기 — SaaS 전환 Unit 01
-- 최소 테이블 + 소유권 기반 RLS
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- profiles
-- ----------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------
-- stores
-- ----------------------------------------------------------
create table if not exists public.stores (
  id                uuid primary key default gen_random_uuid(),
  owner_user_id     uuid not null references auth.users(id) on delete cascade,
  store_name        text,
  status            text not null default 'trialing',
  trial_started_at  timestamptz not null default now(),
  trial_ends_at     timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists stores_owner_user_id_idx
  on public.stores(owner_user_id);

-- ----------------------------------------------------------
-- store_memberships
-- ----------------------------------------------------------
create table if not exists public.store_memberships (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner',
  created_at  timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists store_memberships_user_id_idx
  on public.store_memberships(user_id);

-- ----------------------------------------------------------
-- store_settings
-- ----------------------------------------------------------
create table if not exists public.store_settings (
  store_id       uuid primary key references public.stores(id) on delete cascade,
  currency       text not null default 'KRW',
  channels       jsonb not null,
  cost_rules     jsonb not null,
  goal_settings  jsonb not null,
  fixed_costs    jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ----------------------------------------------------------
-- subscriptions
-- ----------------------------------------------------------
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  store_id              uuid not null references public.stores(id) on delete cascade,
  plan_code             text,
  status                text not null default 'trialing',
  billing_provider      text,
  trial_started_at      timestamptz,
  trial_ends_at         timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  canceled_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists subscriptions_store_id_idx
  on public.subscriptions(store_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.stores            enable row level security;
alter table public.store_memberships enable row level security;
alter table public.store_settings    enable row level security;
alter table public.subscriptions     enable row level security;

-- ----------------------------------------------------------
-- profiles: 본인 행만
-- ----------------------------------------------------------
drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update using (auth.uid() = id);

-- ----------------------------------------------------------
-- stores: owner 또는 membership 보유자 읽기, owner 만 쓰기
-- ----------------------------------------------------------
drop policy if exists "stores_member_select" on public.stores;
create policy "stores_member_select" on public.stores
  for select using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.store_memberships m
      where m.store_id = stores.id
        and m.user_id  = auth.uid()
    )
  );

drop policy if exists "stores_owner_insert" on public.stores;
create policy "stores_owner_insert" on public.stores
  for insert with check (auth.uid() = owner_user_id);

drop policy if exists "stores_owner_update" on public.stores;
create policy "stores_owner_update" on public.stores
  for update using (auth.uid() = owner_user_id);

-- ----------------------------------------------------------
-- store_memberships: 본인 membership 또는 해당 store 의 owner 가 읽기/생성
-- ----------------------------------------------------------
drop policy if exists "memberships_self_select" on public.store_memberships;
create policy "memberships_self_select" on public.store_memberships
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.stores s
      where s.id = store_memberships.store_id
        and s.owner_user_id = auth.uid()
    )
  );

drop policy if exists "memberships_owner_insert" on public.store_memberships;
create policy "memberships_owner_insert" on public.store_memberships
  for insert with check (
    exists (
      select 1 from public.stores s
      where s.id = store_memberships.store_id
        and s.owner_user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- store_settings: membership 보유자 읽기/쓰기
-- ----------------------------------------------------------
drop policy if exists "store_settings_member_select" on public.store_settings;
create policy "store_settings_member_select" on public.store_settings
  for select using (
    exists (
      select 1 from public.store_memberships m
      where m.store_id = store_settings.store_id
        and m.user_id  = auth.uid()
    )
  );

drop policy if exists "store_settings_member_insert" on public.store_settings;
create policy "store_settings_member_insert" on public.store_settings
  for insert with check (
    exists (
      select 1 from public.store_memberships m
      where m.store_id = store_settings.store_id
        and m.user_id  = auth.uid()
    )
  );

drop policy if exists "store_settings_member_update" on public.store_settings;
create policy "store_settings_member_update" on public.store_settings
  for update using (
    exists (
      select 1 from public.store_memberships m
      where m.store_id = store_settings.store_id
        and m.user_id  = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- subscriptions: membership 보유자 읽기
-- ----------------------------------------------------------
drop policy if exists "subscriptions_member_select" on public.subscriptions;
create policy "subscriptions_member_select" on public.subscriptions
  for select using (
    exists (
      select 1 from public.store_memberships m
      where m.store_id = subscriptions.store_id
        and m.user_id  = auth.uid()
    )
  );

-- Note: subscriptions write 는 이번 단계에서 service role 전용으로 둔다.
-- 추후 billing webhook 연동 시 service role 로 갱신한다.
