-- Clients must access Arena data only through the validated RPC functions.
-- RLS remains enabled; this additionally removes table-level privileges so direct
-- REST table access is denied regardless of future policy edits.

revoke all privileges on table public.arena_matches from public, anon, authenticated;
revoke all privileges on table public.arena_scores from public, anon, authenticated;
