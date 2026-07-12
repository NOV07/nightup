-- Featured event requests: organizer/venue asks for their event to be marked featured, admin approves.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

create table if not exists public.featured_event_requests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_featured_event_requests_event_id on public.featured_event_requests(event_id);
create index if not exists idx_featured_event_requests_status on public.featured_event_requests(status);

alter table public.featured_event_requests enable row level security;

-- Owner can see their own requests
create policy "Owners can view their featured requests"
  on public.featured_event_requests for select
  using (auth.uid() = profile_id);

-- Owner can request featured only for events they actually own
create policy "Owners can request featured for own events"
  on public.featured_event_requests for insert
  with check (
    auth.uid() = profile_id
    and exists (select 1 from public.events where id = event_id and profile_id = auth.uid())
  );

-- Status transitions (approve/reject) are done by the admin route via the service role key,
-- which bypasses RLS entirely — no update policy is granted to regular users.
