-- Stage 2, library: watched items and "watch later" on the account.
-- favorite_people and favorite_shows already exist (20261102120000) with
-- own-row RLS. This file does not change them.
--
-- content_items.id is bigint, same identity type stage 1 used for people.id
-- and shows.id. Apply this file yourself. Safe to re-run.
-- The browser never uses the service role.

-- ---------------------------------------------------------------------------
-- Watched. A marker only: the YouTube iframe does not report a position.
-- ---------------------------------------------------------------------------

create table if not exists public.watched_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_item_id bigint not null references public.content_items (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, content_item_id)
);

create index if not exists watched_items_user_id_idx
  on public.watched_items (user_id);

create index if not exists watched_items_content_item_id_idx
  on public.watched_items (content_item_id);

alter table public.watched_items enable row level security;

drop policy if exists "Users can read own watched items" on public.watched_items;
create policy "Users can read own watched items"
on public.watched_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own watched items" on public.watched_items;
create policy "Users can insert own watched items"
on public.watched_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own watched items" on public.watched_items;
create policy "Users can delete own watched items"
on public.watched_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.watched_items from anon, authenticated;
grant select, insert, delete on table public.watched_items to authenticated;
grant all on table public.watched_items to service_role;

-- ---------------------------------------------------------------------------
-- Watch later.
-- ---------------------------------------------------------------------------

create table if not exists public.watch_later (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_item_id bigint not null references public.content_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_item_id)
);

create index if not exists watch_later_user_id_idx
  on public.watch_later (user_id);

create index if not exists watch_later_content_item_id_idx
  on public.watch_later (content_item_id);

alter table public.watch_later enable row level security;

drop policy if exists "Users can read own watch later" on public.watch_later;
create policy "Users can read own watch later"
on public.watch_later
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own watch later" on public.watch_later;
create policy "Users can insert own watch later"
on public.watch_later
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own watch later" on public.watch_later;
create policy "Users can delete own watch later"
on public.watch_later
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.watch_later from anon, authenticated;
grant select, insert, delete on table public.watch_later to authenticated;
grant all on table public.watch_later to service_role;
