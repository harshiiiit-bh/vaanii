-- Freeze exact question content for newly-created Arena matches.
-- Existing matches remain unchanged; their snapshot stays NULL.
alter table public.arena_matches
  add column if not exists question_snapshot jsonb;

create or replace function public.arena_get_match(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row public.arena_matches;
begin
  p_code := upper(trim(coalesce(p_code,'')));

  if p_code !~ '^[0-9A-Z]{32}$' or left(p_code,1) not in ('2','3') then
    return jsonb_build_object('ok',false,'error','Invalid match code');
  end if;

  select * into v_row
  from public.arena_matches
  where code = p_code
    and expires_at > floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

  if v_row.code is null then
    return jsonb_build_object('ok',false,'error','Match metadata not found');
  end if;

  return jsonb_build_object(
    'ok',true,
    'code',v_row.code,
    'host_pid',v_row.host_pid,
    'host_name',v_row.host_name,
    'host_avatar',v_row.host_avatar,
    'expires_at',v_row.expires_at,
    'question_ids',coalesce(v_row.question_ids,'[]'::jsonb),
    'question_snapshot',coalesce(v_row.question_snapshot,'[]'::jsonb)
  );
end;
$function$;

create or replace function public.arena_register_match(
  p_code text,
  p_host_pid text,
  p_host_name text,
  p_host_avatar jsonb,
  p_expires_at bigint,
  p_question_ids jsonb,
  p_question_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_name text;
  v_pid text;
  v_row public.arena_matches;
  v_question_ids jsonb;
  v_question_snapshot jsonb;
begin
  p_code := upper(trim(coalesce(p_code,'')));
  v_pid := trim(coalesce(p_host_pid,''));

  v_name := substring(
    regexp_replace(
      regexp_replace(trim(coalesce(p_host_name,'Cadet')), '[[:cntrl:]]', ' ', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )
    from 1 for 40
  );
  if v_name = '' then v_name := 'Cadet'; end if;

  if p_code !~ '^[0-9A-Z]{32}$' or left(p_code,1) not in ('2','3') then
    return jsonb_build_object('ok',false,'error','Invalid match code');
  end if;
  if v_pid = '' or length(v_pid) > 80 then
    return jsonb_build_object('ok',false,'error','Invalid host id');
  end if;
  if p_expires_at is null or p_expires_at <= 0 then
    return jsonb_build_object('ok',false,'error','Invalid expiry');
  end if;
  if p_host_avatar is not null and jsonb_typeof(p_host_avatar) <> 'object' then
    return jsonb_build_object('ok',false,'error','Invalid avatar');
  end if;

  if p_question_ids is null then
    v_question_ids := '[]'::jsonb;
  elsif jsonb_typeof(p_question_ids) = 'array'
        and jsonb_array_length(p_question_ids) between 1 and 1295
        and not exists (
          select 1
          from jsonb_array_elements(p_question_ids) as e(value)
          where jsonb_typeof(e.value) <> 'string'
             or length(trim(e.value #>> '{}')) = 0
             or length(trim(e.value #>> '{}')) > 160
        )
  then
    v_question_ids := p_question_ids;
  else
    return jsonb_build_object('ok',false,'error','Invalid frozen question IDs');
  end if;

  if p_question_snapshot is null then
    return jsonb_build_object('ok',false,'error','Frozen question snapshot is required for new matches');
  elsif jsonb_typeof(p_question_snapshot) = 'array'
        and jsonb_array_length(p_question_snapshot) between 1 and 1295
        and jsonb_array_length(p_question_snapshot) = jsonb_array_length(v_question_ids)
        and not exists (
          select 1
          from jsonb_array_elements(p_question_snapshot) as e(value)
          where jsonb_typeof(e.value) <> 'object'
             or coalesce(e.value->>'_id','') = ''
             or jsonb_typeof(e.value->'o') <> 'array'
             or e.value->>'q' is null
        )
  then
    v_question_snapshot := p_question_snapshot;
  else
    return jsonb_build_object('ok',false,'error','Invalid frozen question snapshot');
  end if;

  insert into public.arena_matches(
    code,host_pid,host_name,host_avatar,expires_at,question_ids,question_snapshot
  )
  values (
    p_code,
    v_pid,
    v_name,
    p_host_avatar,
    p_expires_at,
    v_question_ids,
    v_question_snapshot
  )
  on conflict (code) do nothing
  returning * into v_row;

  if v_row.code is null then
    select * into v_row from public.arena_matches where code = p_code;
  end if;

  return jsonb_build_object(
    'ok',true,
    'code',v_row.code,
    'host_pid',v_row.host_pid,
    'host_name',v_row.host_name,
    'host_avatar',v_row.host_avatar,
    'expires_at',v_row.expires_at,
    'question_ids',coalesce(v_row.question_ids,'[]'::jsonb),
    'question_snapshot',coalesce(v_row.question_snapshot,'[]'::jsonb)
  );
end;
$function$;
