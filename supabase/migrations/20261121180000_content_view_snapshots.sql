-- View-count history for /rankingi.
-- Apply this file yourself. It does not schedule cron and it does not call
-- the site. Safe to re-run.
--
-- The worker overwrites content_items.view_count every day at 03:00 UTC.
-- After that update it must call:
--   select public.capture_content_view_snapshots();
-- That inserts one row per item for the UTC day. Rows are kept forever:
-- there is no retention job and no DELETE policy.
--
-- Weekly rankings compare the live view_count with the oldest snapshot
-- inside the last p_days UTC dates (today included). If fewer than p_days
-- of history exist, the window shrinks to the dates that do exist.
-- window_days = (today - oldest snapshot in the window) + 1.
-- The ranking stays empty until two distinct captured_on dates exist
-- ("Ranking ruszy jutro"). Shorts are not snapshotted and not ranked.

-- ---------------------------------------------------------------------------
-- Daily snapshots. One row per item per UTC date.
-- ---------------------------------------------------------------------------

create table if not exists public.content_view_snapshots (
  content_item_id bigint not null references public.content_items (id) on delete cascade,
  captured_on date not null,
  view_count bigint not null,
  captured_at timestamptz not null default now(),
  primary key (content_item_id, captured_on),
  constraint content_view_snapshots_view_count_check check (view_count >= 0)
);

create index if not exists content_view_snapshots_captured_on_idx
  on public.content_view_snapshots (captured_on);

comment on table public.content_view_snapshots is
  'Daily YouTube view totals. Kept indefinitely. Written only by service_role via capture_content_view_snapshots.';

alter table public.content_view_snapshots enable row level security;

drop policy if exists "Public can read view snapshots" on public.content_view_snapshots;
create policy "Public can read view snapshots"
on public.content_view_snapshots
for select
to anon, authenticated
using (true);

revoke all on table public.content_view_snapshots from public, anon, authenticated;
grant select on table public.content_view_snapshots to anon, authenticated;
grant all on table public.content_view_snapshots to service_role;

-- ---------------------------------------------------------------------------
-- Eligible catalogue rows for every ranking. security_invoker so anon still
-- only sees approved content_items through RLS.
-- ---------------------------------------------------------------------------

create or replace view public.rankable_videos
with (security_invoker = true) as
select
  ci.id,
  ci.external_id,
  ci.view_count,
  ci.published_at,
  ci.duration_seconds,
  ci.thumbnail_url,
  ci.category_id,
  ci.show_id,
  ci.content_type,
  c.slug as category_slug,
  exists (
    select 1
    from public.content_tags ct
    join public.tags t on t.id = ct.tag_id
    where ct.content_item_id = ci.id
      and t.slug = 'special'
  ) as is_special
from public.content_items ci
left join public.categories c on c.id = ci.category_id
where ci.status = 'approved'
  and ci.merged_into_id is null
  and ci.content_type is distinct from 'short'
  and coalesce(c.slug, '') <> 'shorts';

comment on view public.rankable_videos is
  'Approved, not merged, not Shorts. Includes rows whose view_count is still null.';

revoke all on table public.rankable_videos from public, anon, authenticated;
grant select on table public.rankable_videos to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- How many days of history the weekly ranking can actually see.
-- ---------------------------------------------------------------------------

create or replace function public.ranking_views_window(p_days integer default 7)
returns table (
  window_days integer,
  snapshot_days integer,
  ready boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      greatest(1, least(coalesce(p_days, 7), 366))::integer as days,
      (timezone('utc', now()))::date as today
  ),
  in_window as (
    select s.captured_on
    from public.content_view_snapshots s
    cross join params p
    where s.captured_on >= p.today - (p.days - 1)
      and s.captured_on <= p.today
  ),
  agg as (
    select
      count(distinct captured_on)::integer as snapshot_days,
      min(captured_on) as base_on
    from in_window
  )
  select
    case
      when a.base_on is null then 0
      else least(p.days, (p.today - a.base_on) + 1)
    end::integer as window_days,
    coalesce(a.snapshot_days, 0) as snapshot_days,
    coalesce(a.snapshot_days, 0) >= 2 as ready
  from agg a
  cross join params p;
$$;

revoke all on function public.ranking_views_window(integer) from public;
grant execute on function public.ranking_views_window(integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cumulative gain inside the window.
-- Base for an item = its oldest snapshot in the window that is strictly
-- before today. Gain = current view_count - that base.
-- p_scope: 'all' or 'standup_special' (category standup OR tag special).
-- p_order: 'gain' or 'percent'. Percent requires at least 20 000 base views.
-- ---------------------------------------------------------------------------

create or replace function public.ranking_views_gain(
  p_days integer default 7,
  p_limit integer default 10,
  p_scope text default 'all',
  p_order text default 'gain',
  p_min_base bigint default 0
)
returns table (
  content_item_id bigint,
  view_count bigint,
  base_view_count bigint,
  gain bigint,
  gain_pct numeric,
  window_days integer,
  snapshot_days integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      greatest(1, least(coalesce(p_days, 7), 366))::integer as days,
      greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim,
      (timezone('utc', now()))::date as today,
      case
        when coalesce(p_scope, 'all') = 'standup_special' then 'standup_special'
        else 'all'
      end as scope,
      case
        when coalesce(p_order, 'gain') = 'percent' then 'percent'
        else 'gain'
      end as sort_by,
      case
        when coalesce(p_order, 'gain') = 'percent'
          then greatest(coalesce(p_min_base, 0), 20000)
        else greatest(coalesce(p_min_base, 0), 0)
      end::bigint as min_base
  ),
  in_window as (
    select s.content_item_id, s.captured_on, s.view_count, s.captured_at
    from public.content_view_snapshots s
    cross join params p
    where s.captured_on >= p.today - (p.days - 1)
      and s.captured_on <= p.today
  ),
  meta as (
    select
      (select count(distinct w.captured_on)::integer from in_window w) as snapshot_days,
      (select min(w.captured_on) from in_window w) as base_on
  ),
  meta2 as (
    select
      m.snapshot_days,
      case
        when m.base_on is null then 0
        else least(p.days, (p.today - m.base_on) + 1)
      end::integer as window_days,
      (coalesce(m.snapshot_days, 0) >= 2) as ready
    from meta m
    cross join params p
  ),
  base as (
    select distinct on (w.content_item_id)
      w.content_item_id,
      w.view_count as base_view_count
    from in_window w
    cross join params p
    where w.captured_on < p.today
    order by w.content_item_id, w.captured_on asc, w.captured_at asc
  ),
  scored as (
    select
      v.id as content_item_id,
      v.external_id,
      v.view_count,
      b.base_view_count,
      (v.view_count - b.base_view_count) as gain,
      case
        when b.base_view_count > 0
          then round((v.view_count - b.base_view_count)::numeric * 100 / b.base_view_count, 1)
        else null
      end as gain_pct,
      m.window_days,
      m.snapshot_days,
      p.sort_by
    from public.rankable_videos v
    join base b on b.content_item_id = v.id
    cross join meta2 m
    cross join params p
    where m.ready
      and v.view_count is not null
      and b.base_view_count >= p.min_base
      and (v.view_count - b.base_view_count) > 0
      and (
        p.scope = 'all'
        or v.category_slug = 'standup'
        or v.is_special
      )
  ),
  deduped as (
    select distinct on (coalesce(nullif(btrim(s.external_id), ''), 'id:' || s.content_item_id::text))
      s.content_item_id,
      s.view_count,
      s.base_view_count,
      s.gain,
      s.gain_pct,
      s.window_days,
      s.snapshot_days,
      s.sort_by
    from scored s
    order by
      coalesce(nullif(btrim(s.external_id), ''), 'id:' || s.content_item_id::text),
      case when s.sort_by = 'percent' then s.gain_pct end desc nulls last,
      s.gain desc,
      s.view_count desc,
      s.content_item_id asc
  )
  select
    d.content_item_id,
    d.view_count,
    d.base_view_count,
    d.gain,
    d.gain_pct,
    d.window_days,
    d.snapshot_days
  from deduped d
  order by
    case when d.sort_by = 'percent' then d.gain_pct end desc nulls last,
    d.gain desc,
    d.view_count desc,
    d.content_item_id asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_views_gain(integer, integer, text, text, bigint) from public;
grant execute on function public.ranking_views_gain(integer, integer, text, text, bigint) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- All-time, month, and specials of a year. external_id duplicates collapse
-- to the row with the higher view_count.
-- ---------------------------------------------------------------------------

create or replace function public.ranking_classics(p_limit integer default 10)
returns table (
  content_item_id bigint,
  view_count bigint,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim
  ),
  deduped as (
    select distinct on (coalesce(nullif(btrim(v.external_id), ''), 'id:' || v.id::text))
      v.id,
      v.view_count,
      v.published_at
    from public.rankable_videos v
    where v.view_count is not null
    order by
      coalesce(nullif(btrim(v.external_id), ''), 'id:' || v.id::text),
      v.view_count desc,
      v.id asc
  )
  select d.id as content_item_id, d.view_count, d.published_at
  from deduped d
  order by d.view_count desc, d.id asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_classics(integer) from public;
grant execute on function public.ranking_classics(integer) to anon, authenticated, service_role;

create or replace function public.ranking_month(p_days integer default 30, p_limit integer default 10)
returns table (
  content_item_id bigint,
  view_count bigint,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      greatest(1, least(coalesce(p_days, 30), 366))::integer as days,
      greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim
  ),
  deduped as (
    select distinct on (coalesce(nullif(btrim(v.external_id), ''), 'id:' || v.id::text))
      v.id,
      v.view_count,
      v.published_at
    from public.rankable_videos v
    cross join params p
    where v.view_count is not null
      and v.published_at >= timezone('utc', now()) - make_interval(days => p.days)
    order by
      coalesce(nullif(btrim(v.external_id), ''), 'id:' || v.id::text),
      v.view_count desc,
      v.id asc
  )
  select d.id as content_item_id, d.view_count, d.published_at
  from deduped d
  order by d.view_count desc, d.id asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_month(integer, integer) from public;
grant execute on function public.ranking_month(integer, integer) to anon, authenticated, service_role;

create or replace function public.ranking_special_years()
returns table (year integer)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct extract(year from (v.published_at at time zone 'utc'))::integer as year
  from public.rankable_videos v
  where v.is_special
    and v.published_at is not null
  order by year desc;
$$;

revoke all on function public.ranking_special_years() from public;
grant execute on function public.ranking_special_years() to anon, authenticated, service_role;

create or replace function public.ranking_specials_year(p_year integer default null, p_limit integer default 10)
returns table (
  content_item_id bigint,
  view_count bigint,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select
      coalesce(
        p_year,
        extract(year from timezone('utc', now()))::integer
      ) as year,
      greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim
  ),
  deduped as (
    select distinct on (coalesce(nullif(btrim(v.external_id), ''), 'id:' || v.id::text))
      v.id,
      v.view_count,
      v.published_at
    from public.rankable_videos v
    cross join params p
    where v.is_special
      and v.view_count is not null
      and v.published_at is not null
      and extract(year from (v.published_at at time zone 'utc'))::integer = p.year
    order by
      coalesce(nullif(btrim(v.external_id), ''), 'id:' || v.id::text),
      v.view_count desc,
      v.id asc
  )
  select d.id as content_item_id, d.view_count, d.published_at
  from deduped d
  order by d.view_count desc, d.id asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_specials_year(integer, integer) from public;
grant execute on function public.ranking_specials_year(integer, integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- People and shows.
-- ---------------------------------------------------------------------------

create or replace function public.ranking_people_views(p_limit integer default 10)
returns table (
  person_id bigint,
  name text,
  slug text,
  photo_url text,
  view_count bigint,
  title_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim
  ),
  tagged as (
    select distinct
      p.id as person_id,
      p.name,
      p.slug,
      p.photo_url,
      v.id as content_item_id,
      v.view_count
    from public.rankable_videos v
    join public.content_tags ct on ct.content_item_id = v.id
    join public.tags t on t.id = ct.tag_id
    join public.people p on p.id = t.person_id
    where v.view_count is not null
      and v.content_type = 'video'
      and (v.category_slug = 'standup' or v.is_special)
      and t.tag_type = 'person'
      and t.person_id is not null
      and p.is_active is true
  )
  select
    person_id,
    name,
    slug,
    photo_url,
    sum(view_count)::bigint as view_count,
    count(*)::bigint as title_count
  from tagged
  group by person_id, name, slug, photo_url
  order by view_count desc, title_count desc, name asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_people_views(integer) from public;
grant execute on function public.ranking_people_views(integer) to anon, authenticated, service_role;

create or replace function public.ranking_people_specials(p_limit integer default 10)
returns table (
  person_id bigint,
  name text,
  slug text,
  photo_url text,
  special_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim
  ),
  tagged as (
    select distinct
      p.id as person_id,
      p.name,
      p.slug,
      p.photo_url,
      v.id as content_item_id
    from public.rankable_videos v
    join public.content_tags ct on ct.content_item_id = v.id
    join public.tags t on t.id = ct.tag_id
    join public.people p on p.id = t.person_id
    where v.is_special
      and t.tag_type = 'person'
      and t.person_id is not null
      and p.is_active is true
  )
  select
    person_id,
    name,
    slug,
    photo_url,
    count(*)::bigint as special_count
  from tagged
  group by person_id, name, slug, photo_url
  order by special_count desc, name asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_people_specials(integer) from public;
grant execute on function public.ranking_people_specials(integer) to anon, authenticated, service_role;

create or replace function public.ranking_shows(p_limit integer default 10)
returns table (
  show_id bigint,
  name text,
  slug text,
  view_count bigint,
  episode_count bigint,
  latest_thumbnail_url text,
  latest_published_at timestamptz,
  latest_duration_seconds integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(1, least(coalesce(p_limit, 10), 50))::integer as lim
  ),
  episodes as (
    select
      s.id as show_id,
      s.name,
      s.slug,
      v.id,
      coalesce(v.view_count, 0) as view_count,
      v.published_at,
      v.thumbnail_url,
      v.duration_seconds
    from public.rankable_videos v
    join public.shows s on s.id = v.show_id
    where s.is_active is true
  ),
  agg as (
    select
      show_id,
      name,
      slug,
      sum(view_count)::bigint as view_count,
      count(*)::bigint as episode_count
    from episodes
    group by show_id, name, slug
  ),
  latest as (
    select distinct on (show_id)
      show_id,
      thumbnail_url,
      published_at,
      duration_seconds
    from episodes
    order by show_id, published_at desc nulls last, id desc
  )
  select
    a.show_id,
    a.name,
    a.slug,
    a.view_count,
    a.episode_count,
    l.thumbnail_url as latest_thumbnail_url,
    l.published_at as latest_published_at,
    l.duration_seconds as latest_duration_seconds
  from agg a
  join latest l on l.show_id = a.show_id
  order by a.view_count desc, a.episode_count desc, a.name asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_shows(integer) from public;
grant execute on function public.ranking_shows(integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Service role only. The worker calls this after the daily view_count update.
-- ---------------------------------------------------------------------------

create or replace function public.capture_content_view_snapshots(p_on date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_on date := coalesce(p_on, (timezone('utc', now()))::date);
  v_count integer := 0;
begin
  insert into public.content_view_snapshots (content_item_id, captured_on, view_count)
  select ci.id, v_on, ci.view_count
  from public.content_items ci
  left join public.categories c on c.id = ci.category_id
  where ci.status = 'approved'
    and ci.merged_into_id is null
    and ci.view_count is not null
    and ci.view_count >= 0
    and ci.content_type is distinct from 'short'
    and coalesce(c.slug, '') <> 'shorts'
  on conflict (content_item_id, captured_on) do update
    set view_count = excluded.view_count,
        captured_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.capture_content_view_snapshots(date) is
  'Upsert today''s view_count snapshot. Call from the worker after the 03:00 UTC view update. No retention.';

revoke all on function public.capture_content_view_snapshots(date) from public, anon, authenticated;
grant execute on function public.capture_content_view_snapshots(date) to service_role;

-- Day 0. Re-running the migration on the same UTC date refreshes today's row.
select public.capture_content_view_snapshots(null);
