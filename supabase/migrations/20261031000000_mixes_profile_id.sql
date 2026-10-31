-- Link a mix to the profile it belongs to, so it shows on that profile's page
-- (the "Sets" section of /profile/[username]).
-- Nullable and ON DELETE SET NULL: existing mixes stay unlinked, and deleting a
-- profile leaves the mix up as editorial content instead of removing it.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

alter table public.mixes
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create index if not exists mixes_profile_id_idx on public.mixes (profile_id);
