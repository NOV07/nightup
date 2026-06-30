-- Add event category type, standardized on English enum values to match frontend
-- (HotEventCard.tsx, EventsTabs.tsx, EventsClient.tsx already read e.type as 'culture'|'sports'|'other').
alter table events add column if not exists type text not null default 'music'
  check (type in ('music', 'culture', 'sports', 'other'));

create index if not exists idx_events_type on events(type);
