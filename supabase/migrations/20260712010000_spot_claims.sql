-- Spots Phase 2 (2/3): owner-claim flow (manual admin review only).
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

create table if not exists public.spot_claims (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references public.spots(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  note       text,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (spot_id, profile_id)
);

create index if not exists idx_spot_claims_spot_id on public.spot_claims(spot_id);
create index if not exists idx_spot_claims_status on public.spot_claims(status);

alter table public.spot_claims enable row level security;

create policy "Users can view their own claims"
  on public.spot_claims for select
  using (auth.uid() = profile_id);

create policy "Users can request a claim for themselves"
  on public.spot_claims for insert
  with check (auth.uid() = profile_id);

alter table public.spots add column if not exists claimed_by_profile_id uuid references public.profiles(id);

create policy "Owners can update their claimed spot"
  on public.spots for update
  using (auth.uid() = claimed_by_profile_id)
  with check (auth.uid() = claimed_by_profile_id);