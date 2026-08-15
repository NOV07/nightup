-- Per-user event reactions (interested / going), replacing the anonymous,
-- unauthenticated raw-delta writes app/api/events/react/route.ts used to do
-- directly against events.interested_count/going_count. One row per
-- (event, user, reaction_type) makes a reaction idempotent per user — same
-- shape as listing_interests (20260609001000_listings.sql).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

create table if not exists public.event_reactions (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('interested', 'going')),
  created_at    timestamptz not null default now(),
  unique (event_id, user_id, reaction_type)
);

create index if not exists idx_event_reactions_event_id on public.event_reactions(event_id);
create index if not exists idx_event_reactions_user_id  on public.event_reactions(user_id);

alter table public.event_reactions enable row level security;

create policy "Users can view their own reactions"
  on public.event_reactions for select
  using (auth.uid() = user_id);

create policy "Users can add their own reactions"
  on public.event_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own reactions"
  on public.event_reactions for delete
  using (auth.uid() = user_id);

-- events.interested_count/going_count stay in sync via trigger rather than
-- the API route touching them directly — a plain (non-definer) trigger would
-- run as the calling user, who has no UPDATE grant on events, so this is
-- security definer, same as increment_event_views/increment_profile_views
-- (20260711000000_add_view_tracking.sql, 20260712020000_profiles_view_tracking.sql).
-- Firing on the event_reactions insert/delete keeps the count change atomic
-- with the row that justifies it — no separate read-modify-write, so no race.
create or replace function public.sync_event_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event uuid;
  target_type  text;
  delta        int;
begin
  if tg_op = 'INSERT' then
    target_event := new.event_id;
    target_type  := new.reaction_type;
    delta := 1;
  else
    target_event := old.event_id;
    target_type  := old.reaction_type;
    delta := -1;
  end if;

  if target_type = 'interested' then
    update public.events
      set interested_count = greatest(0, coalesce(interested_count, 0) + delta)
      where id = target_event;
  elsif target_type = 'going' then
    update public.events
      set going_count = greatest(0, coalesce(going_count, 0) + delta)
      where id = target_event;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_event_reactions_sync on public.event_reactions;
create trigger trg_event_reactions_sync
  after insert or delete on public.event_reactions
  for each row execute function public.sync_event_reaction_count();
