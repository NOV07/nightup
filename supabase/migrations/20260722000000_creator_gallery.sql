-- Creator profile gallery: up to 12 showcase photos for artist / organizer / venue
-- profiles (profile_type on public.profiles — NOT the separate public.organizers
-- table, which has no authenticated owner to manage a dashboard gallery for).
-- Professionals already have their own gallery (professionals.gallery text[]) and
-- are intentionally not part of this feature.
-- NOTE: this file is provided for manual review/execution in the Supabase SQL Editor.
-- Do not apply via automated migration runner without explicit confirmation.

create table if not exists public.creator_gallery (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  image_url      text not null,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_creator_gallery_profile on public.creator_gallery(profile_id, display_order);

alter table public.creator_gallery enable row level security;

create policy "Public can view gallery photos"
  on public.creator_gallery for select
  using (true);

create policy "Owners can add their own gallery photos"
  on public.creator_gallery for insert
  with check (auth.uid() = profile_id);

create policy "Owners can reorder their own gallery photos"
  on public.creator_gallery for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Owners can delete their own gallery photos"
  on public.creator_gallery for delete
  using (auth.uid() = profile_id);

-- DB-level 12-photo cap (client also checks this, but the client can be bypassed).
create or replace function public.enforce_creator_gallery_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.creator_gallery where profile_id = new.profile_id) >= 12 then
    raise exception 'creator_gallery: profile % already has the maximum of 12 photos', new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_creator_gallery_limit on public.creator_gallery;
create trigger trg_creator_gallery_limit
  before insert on public.creator_gallery
  for each row execute function public.enforce_creator_gallery_limit();

-- Storage bucket. Existing buckets (uploads, events, article-images) have no
-- migration history in this repo, which suggests they were created via the
-- Supabase Dashboard rather than SQL. This statement should work via the SQL
-- Editor, but if it's rejected in your project, create the bucket manually
-- instead: Storage -> New bucket -> name "creator-gallery", Public bucket ON.
insert into storage.buckets (id, name, public)
values ('creator-gallery', 'creator-gallery', true)
on conflict (id) do nothing;

-- Storage policies mirror the ImageUpload.tsx convention already used by the
-- "uploads" bucket: objects are stored at "{auth.uid()}/{folder}/{filename}",
-- so the owner check matches on the first path segment.
create policy "Public read access to creator gallery photos"
  on storage.objects for select
  using (bucket_id = 'creator-gallery');

create policy "Owners can upload their own gallery photos"
  on storage.objects for insert
  with check (
    bucket_id = 'creator-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can replace their own gallery photos"
  on storage.objects for update
  using (
    bucket_id = 'creator-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can delete their own gallery photo files"
  on storage.objects for delete
  using (
    bucket_id = 'creator-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
