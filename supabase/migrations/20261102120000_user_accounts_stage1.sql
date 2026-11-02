-- Stage 1 accounts: admin allowlist, profiles, favorite tables, and
-- authenticated read access to the public catalog.
--
-- people.id and shows.id are bigint. The events migration already references
-- public.people(id) as bigint (20261026094437_create_events.sql). shows has no
-- CREATE TABLE in this repo; its id is bigint as well (same identity type as
-- people, categories, sources, and content_items.show_id). favorite_* foreign
-- keys use bigint. show_default_people.show_id/person_id are integer and are
-- left unchanged.
--
-- Apply this file yourself. It is written to be safe to re-run.

-- ---------------------------------------------------------------------------
-- Admins. Membership is the only thing that may open /admin.
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "Users can read own admin row" on public.admins;
create policy "Users can read own admin row"
on public.admins
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.admins from anon, authenticated;
grant select on table public.admins to authenticated;
grant all on table public.admins to service_role;

-- True only when the current JWT belongs to a row in public.admins.
-- security definer so the check does not depend on the caller being able to
-- read other people's rows. search_path is pinned and names are qualified.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

-- Seed the single existing auth user as admin.
-- A bare unordered limit-1 pick is intentionally not used. If auth.users has
-- more than one row, this insert matches nothing rather than guessing.
insert into public.admins (user_id)
select id
from auth.users
where (select count(*) from auth.users) = 1
  and id = (select id from auth.users order by created_at limit 1)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles. One row per auth user, created by a trigger.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, push_enabled) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Not an RPC. Auth's insert role still needs EXECUTE so the trigger fires.
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Existing accounts (the current admin) never pass through the insert trigger.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Favorites. Tables and RLS only; the portal still uses localStorage.
-- ---------------------------------------------------------------------------

create table if not exists public.favorite_people (
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id bigint not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, person_id)
);

create index if not exists favorite_people_person_id_idx
  on public.favorite_people (person_id);

alter table public.favorite_people enable row level security;

drop policy if exists "Users can read own favorite people" on public.favorite_people;
create policy "Users can read own favorite people"
on public.favorite_people
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own favorite people" on public.favorite_people;
create policy "Users can insert own favorite people"
on public.favorite_people
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own favorite people" on public.favorite_people;
create policy "Users can delete own favorite people"
on public.favorite_people
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.favorite_people from anon, authenticated;
grant select, insert, delete on table public.favorite_people to authenticated;
grant all on table public.favorite_people to service_role;

create table if not exists public.favorite_shows (
  user_id uuid not null references auth.users (id) on delete cascade,
  show_id bigint not null references public.shows (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

create index if not exists favorite_shows_show_id_idx
  on public.favorite_shows (show_id);

alter table public.favorite_shows enable row level security;

drop policy if exists "Users can read own favorite shows" on public.favorite_shows;
create policy "Users can read own favorite shows"
on public.favorite_shows
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own favorite shows" on public.favorite_shows;
create policy "Users can insert own favorite shows"
on public.favorite_shows
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own favorite shows" on public.favorite_shows;
create policy "Users can delete own favorite shows"
on public.favorite_shows
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.favorite_shows from anon, authenticated;
grant select, insert, delete on table public.favorite_shows to authenticated;
grant all on table public.favorite_shows to service_role;

-- ---------------------------------------------------------------------------
-- Catalog reads. Anon policies stay; authenticated gets the same conditions.
-- service_role policies are not dropped.
-- ---------------------------------------------------------------------------

drop policy if exists "Public can read approved items" on public.content_items;
create policy "Public can read approved items"
on public.content_items
for select
to anon, authenticated
using (status = 'approved'::text);

drop policy if exists "Public can read comedians" on public.people;
create policy "Public can read comedians"
on public.people
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read shows" on public.shows;
create policy "Public can read shows"
on public.shows
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read tags" on public.tags;
create policy "Public can read tags"
on public.tags
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read content_tags" on public.content_tags;
create policy "Public can read content_tags"
on public.content_tags
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read sources" on public.sources;
create policy "Public can read sources"
on public.sources
for select
to anon, authenticated
using (true);

drop policy if exists "anon read show_default_people" on public.show_default_people;
create policy "anon read show_default_people"
on public.show_default_people
for select
to anon, authenticated
using (true);

-- No INSERT/UPDATE/DELETE policy exists for anon or authenticated on these
-- tables. Table-level write grants would still be a hole if RLS were loosened.
-- service_role is not listed here, so its grants stay.
do $$
declare
  catalog text;
begin
  foreach catalog in array array[
    'content_items',
    'people',
    'shows',
    'tags',
    'content_tags',
    'categories',
    'sources',
    'show_default_people',
    'source_default_people'
  ]
  loop
    execute format(
      'revoke insert, update, delete on table public.%I from anon, authenticated',
      catalog
    );
    execute format(
      'grant select on table public.%I to anon, authenticated',
      catalog
    );
  end loop;
end $$;
