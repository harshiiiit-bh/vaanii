-- Limit the anonymous Arena API to the current, validated RPC signatures.
-- The browser uses the 7-argument match registration (frozen snapshot) and v2
-- attempt submission. Older overloads allow weaker/legacy payloads and are no
-- longer called by the current Vaani client.
--
-- The tables intentionally have RLS enabled without public table policies:
-- clients must go through the RPCs below instead of reading/writing tables.

revoke execute on function public.arena_register_match(text, text, text, jsonb, bigint)
  from public, anon, authenticated;
revoke execute on function public.arena_register_match(text, text, text, jsonb, bigint, jsonb)
  from public, anon, authenticated;
revoke execute on function public.arena_submit_attempt(text, text, text, numeric, integer, integer, jsonb, bigint)
  from public, anon, authenticated;

-- Remove implicit PUBLIC execution from the current RPCs. Explicitly grant only
-- the browser's anonymous role and the server-side service role.
revoke execute on function public.arena_get_leaderboard(text) from public, anon, authenticated;
grant execute on function public.arena_get_leaderboard(text) to anon, service_role;

revoke execute on function public.arena_get_match(text) from public, anon, authenticated;
grant execute on function public.arena_get_match(text) to anon, service_role;

revoke execute on function public.arena_register_match(text, text, text, jsonb, bigint, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.arena_register_match(text, text, text, jsonb, bigint, jsonb, jsonb)
  to anon, service_role;

revoke execute on function public.arena_submit_attempt_v2(text, text, text, numeric, integer, integer, integer, integer, integer, jsonb, bigint)
  from public, anon, authenticated;
grant execute on function public.arena_submit_attempt_v2(text, text, text, numeric, integer, integer, integer, integer, integer, jsonb, bigint)
  to anon, service_role;
