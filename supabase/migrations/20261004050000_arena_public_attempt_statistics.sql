-- Arena public attempt summaries
-- Store only aggregate correctness counts in the shared leaderboard payload.
-- Raw answers remain private to the submission row and are never returned by
-- the public leaderboard function.

alter table public.arena_scores
  add column if not exists correct integer,
  add column if not exists incorrect integer,
  add column if not exists skipped integer;

create or replace function public.arena_get_leaderboard(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_code text;
  v_rows jsonb;
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  v_code := upper(trim(coalesce(p_code, '')));
  if v_code !~ '^[0-9A-Z]{32}$' or left(v_code, 1) not in ('2','3') then
    return jsonb_build_object('ok', false, 'error', 'Invalid match code', 'rows', '[]'::jsonb);
  end if;

  if not exists (
    select 1 from public.arena_matches m
    where m.code = v_code and m.expires_at > v_now
  ) then
    return jsonb_build_object('ok', true, 'rows', '[]'::jsonb, 'verified', false, 'source', 'shared');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', s.code,
        'pid', s.pid,
        'name', s.name,
        'score', s.score,
        'seconds', s.seconds,
        'total', s.total,
        'correct', s.correct,
        'incorrect', s.incorrect,
        'skipped', s.skipped,
        'at', s.at
      )
      order by s.score desc, s.seconds asc, s.at asc
    ), '[]'::jsonb
  )
  into v_rows
  from (
    select code, pid, name, score, seconds, total, correct, incorrect, skipped, at
    from public.arena_scores
    where code = v_code and (expires_at is null or expires_at > v_now)
    order by score desc, seconds asc, at asc
    limit 100
  ) s;

  return jsonb_build_object('ok', true, 'rows', v_rows, 'verified', false, 'source', 'shared');
end;
$function$;

create or replace function public.arena_submit_attempt_v2(
  p_code text,
  p_pid text,
  p_name text,
  p_score numeric,
  p_seconds integer,
  p_total integer,
  p_correct integer default null,
  p_incorrect integer default null,
  p_skipped integer default null,
  p_answers jsonb default '{}'::jsonb,
  p_expires_at bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_name text;
  v_pid text;
  v_inserted integer;
  v_match_expiry bigint;
  v_correct integer;
  v_incorrect integer;
  v_skipped integer;
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  p_code := upper(trim(coalesce(p_code, '')));
  v_pid := trim(coalesce(p_pid, ''));
  v_name := substring(
    regexp_replace(
      regexp_replace(trim(coalesce(p_name,'Cadet')), '[[:cntrl:]]', ' ', 'g'),
      '[[:space:]]+',
      ' ', 'g'
    ) from 1 for 48
  );
  if v_name = '' then v_name := 'Cadet'; end if;

  if p_code !~ '^[0-9A-Z]{32}$' or left(p_code, 1) not in ('2','3') then
    return jsonb_build_object('ok', false, 'error', 'Invalid match code');
  end if;
  if v_pid = '' or length(v_pid) > 80 then
    return jsonb_build_object('ok', false, 'error', 'Invalid player id');
  end if;

  select m.expires_at into v_match_expiry
  from public.arena_matches m
  where m.code = p_code and m.expires_at > v_now;
  if v_match_expiry is null then
    return jsonb_build_object('ok', false, 'error', 'Match is closed or not found');
  end if;

  if p_total is null or p_total < 1 or p_total > 1295 then
    return jsonb_build_object('ok', false, 'error', 'Invalid question count');
  end if;
  if p_score is null or p_score < -p_total or p_score > p_total then
    return jsonb_build_object('ok', false, 'error', 'Invalid score');
  end if;
  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    return jsonb_build_object('ok', false, 'error', 'Invalid completion time');
  end if;

  if p_correct is null or p_incorrect is null or p_skipped is null then
    v_correct := null;
    v_incorrect := null;
    v_skipped := null;
  else
    if p_correct < 0 or p_incorrect < 0 or p_skipped < 0
       or p_correct + p_incorrect + p_skipped <> p_total then
      return jsonb_build_object('ok', false, 'error', 'Invalid attempt statistics');
    end if;
    v_correct := p_correct;
    v_incorrect := p_incorrect;
    v_skipped := p_skipped;
  end if;

  if p_answers is null then p_answers := '{}'::jsonb; end if;
  if jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 65536 then
    return jsonb_build_object('ok', false, 'error', 'Invalid answer record');
  end if;

  insert into public.arena_scores(
    code,pid,name,score,seconds,total,correct,incorrect,skipped,at,answers,expires_at
  )
  values (
    p_code,v_pid,v_name,round(p_score,2),p_seconds,p_total,
    v_correct,v_incorrect,v_skipped,
    v_now,p_answers,coalesce(p_expires_at,v_match_expiry)
  )
  on conflict (code,pid) do nothing;

  get diagnostics v_inserted = row_count;
  return jsonb_build_object('ok', true, 'duplicate', v_inserted = 0, 'source', 'shared');
end;
$function$;