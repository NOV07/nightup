-- notifications: no client can create notifications any more.
--
-- Until now the live policy "System can insert notifications" had
-- WITH CHECK (true), so any anon or authenticated client could write a
-- notification for ANY user, with any title and link. Notifications are now
-- written only by server code (app/lib/notify.ts) with the service-role client
-- after the session and the triggering action (follow, listing interest) have
-- been verified. The service role bypasses RLS, so it needs no policy.
--
-- RUN THIS ONLY AFTER the code that uses app/lib/notify.ts is deployed,
-- otherwise follow / listing-interest notifications stop being delivered.
--
-- Kept for the signed-in user, on their own rows only (what the app uses today:
-- GET /api/notifications, PATCH /api/notifications and /api/notifications/[id]):
--   * SELECT own
--   * UPDATE own (marking as read)
-- The app never deletes notifications, so there is deliberately no DELETE
-- policy. Admin deletes of users clear their notifications through the
-- service role / ON DELETE CASCADE.
--
-- Idempotent. To be run by hand in the Supabase SQL Editor.

alter table public.notifications enable row level security;

-- Drop EVERY existing policy (including "System can insert notifications" and
-- the FOR ALL "Users see only their own notifications", which also allowed
-- INSERT/DELETE on own rows) whatever the live names are, then recreate the
-- two we want.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
  loop
    execute format('drop policy %I on public.notifications', p.policyname);
  end loop;
end $$;

create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Users mark their own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Belt and braces at the privilege level: even if a permissive policy is added
-- by mistake later, anon/authenticated still cannot insert or delete, and can
-- only change the `read` column. (Supabase grants these by default.)
revoke all on public.notifications from anon;
revoke insert, delete, update, truncate on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
