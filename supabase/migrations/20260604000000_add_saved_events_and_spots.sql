-- saved_events: one row per (user, event) pair
create table if not exists saved_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references events(id)     on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

-- saved_spots: one row per (user, spot) pair
-- spot_id is text because spots.id may be integer or uuid
create table if not exists saved_spots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  spot_id    text not null,
  created_at timestamptz not null default now(),
  unique (user_id, spot_id)
);

-- RLS — users see and manage only their own rows
alter table saved_events enable row level security;
alter table saved_spots  enable row level security;

create policy "saved_events: select own"
  on saved_events for select using (auth.uid() = user_id);

create policy "saved_events: insert own"
  on saved_events for insert with check (auth.uid() = user_id);

create policy "saved_events: delete own"
  on saved_events for delete using (auth.uid() = user_id);

create policy "saved_spots: select own"
  on saved_spots for select using (auth.uid() = user_id);

create policy "saved_spots: insert own"
  on saved_spots for insert with check (auth.uid() = user_id);

create policy "saved_spots: delete own"
  on saved_spots for delete using (auth.uid() = user_id);
