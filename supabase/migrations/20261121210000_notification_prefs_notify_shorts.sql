-- Shorts pushes are opt-in. Existing rows and a missing switch stay off.
-- Apply this file yourself. Safe to re-run. It does not send anything.
--
-- notification_prefs already limits rows to the owner. These policies are the
-- same ones as the other switches: authenticated clients can read, insert, and
-- update only their own row. Anonymous clients get nothing. Update is limited
-- to the switch columns, including this one.

alter table public.notification_prefs
  add column if not exists notify_shorts boolean not null default false;

alter table public.notification_prefs enable row level security;

drop policy if exists "Users can read own notification prefs" on public.notification_prefs;
create policy "Users can read own notification prefs"
on public.notification_prefs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification prefs" on public.notification_prefs;
create policy "Users can insert own notification prefs"
on public.notification_prefs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notification prefs" on public.notification_prefs;
create policy "Users can update own notification prefs"
on public.notification_prefs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.notification_prefs from public, anon, authenticated;
grant select, insert on table public.notification_prefs to authenticated;
grant update (
  new_content_favorites,
  events_home_city,
  events_favorites,
  event_reminders,
  notify_shorts
) on table public.notification_prefs to authenticated;
grant all on table public.notification_prefs to service_role;
