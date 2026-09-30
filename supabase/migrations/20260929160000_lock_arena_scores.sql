-- Preserve historical Arena score rows, but remove direct public access.
-- The arena-leaderboard Edge Function uses a server-only key and exposes only
-- sanitized leaderboard fields. Score submissions remain disabled until a
-- separate server-side validator exists.

drop policy if exists "read" on public.arena_scores;
drop policy if exists "insert" on public.arena_scores;
drop policy if exists "cleanup_expired" on public.arena_scores;

revoke all on table public.arena_scores from public, anon, authenticated;

