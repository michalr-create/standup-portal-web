-- Stage 2, places: home city, event reminders, and going/attended.
-- Push notifications are not part of this file.
-- events.id is bigint. Apply this file yourself. Safe to re-run.
-- The browser never uses the service role.

-- ---------------------------------------------------------------------------
-- Home city. Empty means "no default". The portal treats a missing ?miasto=
-- as "use this", and ?miasto= as "show every city".
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists home_city text;

alter table public.profiles drop constraint if exists profiles_home_city_check;
alter table public.profiles
  add constraint profiles_home_city_check
  check (home_city is null or char_length(btrim(home_city)) between 1 and 80);

revoke update on table public.profiles from authenticated;
grant update (display_name, push_enabled, home_city) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Reminders. One row per user and event. Delivery stays in stage 3.
-- ---------------------------------------------------------------------------

create table if not exists public.event_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id bigint not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists event_reminders_user_id_idx
  on public.event_reminders (user_id);

create index if not exists event_reminders_event_id_idx
  on public.event_reminders (event_id);

alter table public.event_reminders enable row level security;

drop policy if exists "Users can read own event reminders" on public.event_reminders;
create policy "Users can read own event reminders"
on public.event_reminders
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own event reminders" on public.event_reminders;
create policy "Users can insert own event reminders"
on public.event_reminders
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own event reminders" on public.event_reminders;
create policy "Users can delete own event reminders"
on public.event_reminders
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.event_reminders from anon, authenticated;
grant select, insert, delete on table public.event_reminders to authenticated;
grant all on table public.event_reminders to service_role;

-- ---------------------------------------------------------------------------
-- Going / attended. "attended" is only legal once the event has started.
-- ---------------------------------------------------------------------------

create table if not exists public.event_attendance (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id bigint not null references public.events (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id),
  constraint event_attendance_status_check check (status in ('going', 'attended'))
);

create index if not exists event_attendance_user_id_idx
  on public.event_attendance (user_id);

create index if not exists event_attendance_event_id_idx
  on public.event_attendance (event_id);

create index if not exists event_attendance_going_idx
  on public.event_attendance (event_id)
  where status = 'going';

alter table public.event_attendance enable row level security;

drop policy if exists "Users can read own attendance" on public.event_attendance;
create policy "Users can read own attendance"
on public.event_attendance
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own attendance" on public.event_attendance;
create policy "Users can insert own attendance"
on public.event_attendance
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own attendance" on public.event_attendance;
create policy "Users can update own attendance"
on public.event_attendance
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own attendance" on public.event_attendance;
create policy "Users can delete own attendance"
on public.event_attendance
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.event_attendance from anon, authenticated;
grant select, insert, update, delete on table public.event_attendance to authenticated;
grant all on table public.event_attendance to service_role;

create or replace function public.enforce_event_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  starts timestamptz;
begin
  select starts_at into starts
  from public.events
  where id = new.event_id;

  if starts is null then
    raise exception 'event_attendance_missing' using errcode = 'P0001';
  end if;
  if new.status = 'attended' and starts > now() then
    raise exception 'attended_requires_past_event' using errcode = 'P0001';
  end if;
  if new.status = 'going' and starts <= now() then
    raise exception 'going_requires_future_event' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_event_attendance() from public, anon, authenticated;

drop trigger if exists event_attendance_enforce on public.event_attendance;
create trigger event_attendance_enforce
  before insert or update on public.event_attendance
  for each row
  execute function public.enforce_event_attendance();

-- Public aggregate. Counts only, no user ids.
create or replace function public.going_counts(event_ids bigint[])
returns table (event_id bigint, going_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select a.event_id, count(*)::bigint as going_count
  from public.event_attendance a
  where a.status = 'going'
    and a.event_id = any (coalesce(event_ids, '{}'::bigint[])[1:200])
  group by a.event_id
$$;

revoke all on function public.going_counts(bigint[]) from public;
grant execute on function public.going_counts(bigint[]) to anon, authenticated, service_role;

-- The caller's own reminders, including events that are no longer in the
-- public future-only listing. Still only on_sale / sold_out, and only the
-- caller's rows.
create or replace function public.my_event_reminders()
returns table (
  event_id bigint,
  title text,
  starts_at timestamptz,
  city text,
  venue text,
  ticket_url text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.starts_at, e.city, e.venue, e.ticket_url, e.status
  from public.event_reminders r
  join public.events e on e.id = r.event_id
  where r.user_id = (select auth.uid())
    and e.status in ('on_sale', 'sold_out')
  order by e.starts_at asc
$$;

revoke all on function public.my_event_reminders() from public, anon;
grant execute on function public.my_event_reminders() to authenticated, service_role;
