-- Wellness spots: μη εμπορικά σημεία με θέα (λόφοι, πλατείες, παγκάκια)
create table if not exists public.wellness_spots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  area text,
  kind text not null default 'viewpoint'
    check (kind in ('viewpoint','hill','park','square')),
  description text,
  best_time text not null default 'sunset'
    check (best_time in ('day','sunset','night','all')),
  has_bench boolean,                       -- null = άγνωστο
  access_note text,                        -- πώς φτάνεις
  lat double precision,
  lng double precision,
  coords_verified boolean not null default false,
  verified_night boolean not null default false,  -- έχει επισκεφτεί βράδυ ο Μίμης
  photo_urls text[] not null default '{}',
  source_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellness_spots_lat_chk check (lat is null or lat between -90 and 90),
  constraint wellness_spots_lng_chk check (lng is null or lng between -180 and 180),
  -- δεν δημοσιεύεται σημείο χωρίς συντεταγμένες
  constraint wellness_spots_published_needs_coords
    check (not published or (lat is not null and lng is not null))
);

create index if not exists wellness_spots_published_idx
  on public.wellness_spots (published);

create or replace function public.wellness_spots_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wellness_spots_updated_at on public.wellness_spots;
create trigger trg_wellness_spots_updated_at
  before update on public.wellness_spots
  for each row execute function public.wellness_spots_set_updated_at();

-- RLS: οι επισκέπτες βλέπουν μόνο τα δημοσιευμένα.
-- Δεν υπάρχουν insert/update/delete policies: γράφει μόνο το service role (admin API).
alter table public.wellness_spots enable row level security;

drop policy if exists "wellness_spots_public_read" on public.wellness_spots;
create policy "wellness_spots_public_read"
  on public.wellness_spots
  for select
  to anon, authenticated
  using (published = true);

-- Bucket φωτογραφιών: public (οι εικόνες σερβίρονται με public URL).
-- Σκόπιμα ΔΕΝ προσθέτουμε SELECT policy στα storage.objects, ώστε να μην γίνεται listing.
-- Τα uploads γίνονται μόνο από το admin API με service role.
-- Αν το insert απορριφθεί από τα δικαιώματα του SQL editor, φτιάξε το bucket
-- από το Dashboard: Storage -> New bucket -> "wellness-spots", Public bucket ON.
insert into storage.buckets (id, name, public)
values ('wellness-spots', 'wellness-spots', true)
on conflict (id) do nothing;
