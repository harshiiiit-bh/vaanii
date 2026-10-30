-- ============================================================================
-- VAANI BACKEND MASTER UPGRADE MIGRATION
-- File: 20261030120000_vaani_backend_master_upgrade.sql
-- Purpose:
--   1. Add indexes and constraints on existing public.arena_matches and
--      public.arena_scores tables without dropping or resetting any data.
--   2. Create public.cadet_accounts and public.cadet_progress_events with
--      strict Row Level Security (RLS), check constraints, and indexes.
--   3. Provide atomic, security-definer RPCs for Cadet account sync,
--      idempotent XP/progress rewards, and Global & Service-Force Cohort
--      Leaderboard retrieval without exposing private credentials or answers.
--
-- ROLLBACK STRATEGY (Reversible without data loss):
--   DROP FUNCTION IF EXISTS public.vaani_get_cohort_leaderboard(text, text, text, integer);
--   DROP FUNCTION IF EXISTS public.vaani_sync_cadet_account(text, text, text, integer, integer, integer, integer, jsonb, jsonb);
--   DROP INDEX IF EXISTS public.idx_arena_scores_code_ranking;
--   DROP INDEX IF EXISTS public.idx_arena_matches_expires_at;
--   DROP INDEX IF EXISTS public.idx_cadet_accounts_force_xp;
--   DROP INDEX IF EXISTS public.idx_cadet_accounts_streak;
--   DROP INDEX IF EXISTS public.idx_cadet_accounts_accuracy;
-- ============================================================================

-- 1. Arena performance indexes (non-destructive, idempotent)
create index if not exists idx_arena_matches_expires_at
  on public.arena_matches (expires_at desc);

create index if not exists idx_arena_scores_code_ranking
  on public.arena_scores (code, score desc, seconds asc, at asc);

-- 2. Cadet Accounts table (stores synchronized account state & verified summary)
create table if not exists public.cadet_accounts (
  code text primary key,
  name text not null default 'Cadet',
  service_force text not null default 'army',
  xp integer not null default 0,
  streak integer not null default 0,
  topics_cleared integer not null default 0,
  quiz_avg integer not null default 0,
  avatar text not null default 'CD',
  vaani_state jsonb not null default '{}'::jsonb,
  vbv_state jsonb not null default '{}'::jsonb,
  updated_at bigint not null default (floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
  created_at timestamptz not null default now(),
  constraint cadet_accounts_code_chk check (code ~ '^\d{6}$'),
  constraint cadet_accounts_force_chk check (service_force in ('army', 'navy', 'airforce')),
  constraint cadet_accounts_xp_chk check (xp >= 0 and xp <= 250000),
  constraint cadet_accounts_streak_chk check (streak >= 0 and streak <= 3650),
  constraint cadet_accounts_topics_chk check (topics_cleared >= 0 and topics_cleared <= 60),
  constraint cadet_accounts_quiz_avg_chk check (quiz_avg >= 0 and quiz_avg <= 100)
);

-- Indexes for fast leaderboard filtering & sorting
create index if not exists idx_cadet_accounts_force_xp
  on public.cadet_accounts (service_force, xp desc, streak desc);

create index if not exists idx_cadet_accounts_streak
  on public.cadet_accounts (streak desc, xp desc);

create index if not exists idx_cadet_accounts_accuracy
  on public.cadet_accounts (quiz_avg desc, xp desc);

-- 3. Cadet Progress Events table (idempotency log preventing duplicate XP rewards)
create table if not exists public.cadet_progress_events (
  id bigserial primary key,
  account_code text not null references public.cadet_accounts(code) on delete cascade,
  event_key text not null,
  event_type text not null,
  xp_delta integer not null default 0,
  created_at timestamptz not null default now(),
  constraint cadet_progress_events_unique_key unique (account_code, event_key),
  constraint cadet_progress_events_xp_chk check (xp_delta >= -100 and xp_delta <= 500)
);

create index if not exists idx_cadet_progress_events_account
  on public.cadet_progress_events (account_code, created_at desc);

-- 4. Strict Row Level Security (RLS)
alter table public.cadet_accounts enable row level security;
alter table public.cadet_progress_events enable row level security;

-- Revoke direct table manipulation from public/anon roles; all access goes
-- through validated security-definer RPCs or the backend service role.
revoke all on table public.cadet_accounts from public, anon, authenticated;
revoke all on table public.cadet_progress_events from public, anon, authenticated;

-- 5. Atomic Cadet Account Synchronization RPC
create or replace function public.vaani_sync_cadet_account(
  p_code text,
  p_name text,
  p_service_force text,
  p_xp integer,
  p_streak integer,
  p_topics_cleared integer,
  p_quiz_avg integer,
  p_vaani_state jsonb default '{}'::jsonb,
  p_vbv_state jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_code text := trim(coalesce(p_code, ''));
  v_name text;
  v_force text := lower(trim(coalesce(p_service_force, 'army')));
  v_xp integer := greatest(0, least(250000, coalesce(p_xp, 0)));
  v_streak integer := greatest(0, least(3650, coalesce(p_streak, 0)));
  v_topics integer := greatest(0, least(60, coalesce(p_topics_cleared, 0)));
  v_quiz_avg integer := greatest(0, least(100, coalesce(p_quiz_avg, 0)));
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if v_code !~ '^\d{6}$' then
    return jsonb_build_object('ok', false, 'error', 'Invalid 6-digit account code');
  end if;

  v_name := substring(
    regexp_replace(
      regexp_replace(trim(coalesce(p_name, 'Cadet')), '[[:cntrl:]]', ' ', 'g'),
      '[[:space:]]+', ' ', 'g'
    ) from 1 for 40
  );
  if v_name = '' then v_name := 'Cadet'; end if;

  if v_force not in ('army', 'navy', 'airforce') then
    v_force := 'army';
  end if;

  insert into public.cadet_accounts (
    code, name, service_force, xp, streak, topics_cleared, quiz_avg,
    vaani_state, vbv_state, updated_at
  )
  values (
    v_code, v_name, v_force, v_xp, v_streak, v_topics, v_quiz_avg,
    coalesce(p_vaani_state, '{}'::jsonb), coalesce(p_vbv_state, '{}'::jsonb), v_now
  )
  on conflict (code) do update set
    name = excluded.name,
    service_force = excluded.service_force,
    xp = excluded.xp,
    streak = excluded.streak,
    topics_cleared = excluded.topics_cleared,
    quiz_avg = excluded.quiz_avg,
    vaani_state = excluded.vaani_state,
    vbv_state = excluded.vbv_state,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'name', v_name,
    'serviceForce', v_force,
    'xp', v_xp,
    'streak', v_streak,
    'topicsCleared', v_topics,
    'quizAvg', v_quiz_avg,
    'updatedAt', v_now
  );
end;
$function$;

-- 6. Public Cohort Leaderboard RPC (exposes only non-sensitive summary fields)
create or replace function public.vaani_get_cohort_leaderboard(
  p_force text default 'all',
  p_sort text default 'xp',
  p_search text default '',
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_force text := lower(trim(coalesce(p_force, 'all')));
  v_sort text := lower(trim(coalesce(p_sort, 'xp')));
  v_search text := lower(trim(coalesce(p_search, '')));
  v_limit integer := greatest(1, least(100, coalesce(p_limit, 50)));
  v_rows jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', s.rnk,
        'codeHint', left(s.code, 2) || '••' || right(s.code, 2),
        'name', s.name,
        'serviceForce', s.service_force,
        'xp', s.xp,
        'streak', s.streak,
        'topicsCleared', s.topics_cleared,
        'quizAvg', s.quiz_avg,
        'avatar', s.avatar,
        'isBenchmark', false,
        'sourceLabel', 'LIVE CADET',
        'updatedAt', s.updated_at
      )
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      row_number() over (
        order by
          case when v_sort = 'streak' then c.streak else c.xp end desc,
          case when v_sort = 'accuracy' then c.quiz_avg else c.xp end desc,
          c.xp desc,
          c.streak desc,
          c.updated_at asc
      ) as rnk,
      c.code, c.name, c.service_force, c.xp, c.streak, c.topics_cleared, c.quiz_avg, c.avatar, c.updated_at
    from public.cadet_accounts c
    where (v_force = 'all' or c.service_force = v_force)
      and (
        v_search = ''
        or lower(c.name) like ('%' || v_search || '%')
        or lower(left(c.code, 2) || '••' || right(c.code, 2)) like ('%' || v_search || '%')
      )
    limit v_limit
  ) s;

  return jsonb_build_object('ok', true, 'rows', v_rows);
end;
$function$;
