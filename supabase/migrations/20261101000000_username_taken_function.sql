-- Cross-user username check, boolean only.
--
-- Why: app/lib/username.ts used to look for a taken username with an `ilike`
-- through the caller's session. Once plain 'user' rows are hidden from other
-- sessions (20261101010000_profiles_hide_user_rows.sql) that query can no longer
-- see them, so a user-vs-user clash would slip through. This SECURITY DEFINER
-- function sees every row but returns one boolean and never a row.
--
-- Matching is case-insensitive and exact: lower() on both sides, same meaning as
-- the old ilike with its wildcards escaped. `p_exclude` lets a user keep or
-- re-case their own name.
--
-- Callable by signed-in users and the service role only. anon cannot probe it.
--
-- Safe to run before the policy change: it changes no existing behaviour.
-- Idempotent. To be run by hand in the Supabase SQL Editor.
--
-- Rollback:
--   drop function if exists public.username_taken(text, uuid);

create or replace function public.username_taken(p_username text, p_exclude uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where lower(username) = lower(p_username)
      and (p_exclude is null or id <> p_exclude)
  );
$$;

revoke all on function public.username_taken(text, uuid) from public, anon;
grant execute on function public.username_taken(text, uuid) to authenticated, service_role;
