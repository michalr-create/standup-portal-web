-- Multi-part specials and profile lookup indexes.
-- Apply this file yourself. The portal already collapses programs in
-- lib/program-parts.ts, so counts on /rankingi are correct before this runs.
-- After it runs, ranking_people_specials uses the same rule.
--
-- Benshi is five approved rows, show_id null, titled
-- `(program BENSHI n/5)`. They share the program name, not a show.
-- A shared show_id by itself does not merge a format or a festival.

create index if not exists show_default_people_person_id_idx
  on public.show_default_people (person_id);

-- Profile tour filters person_id + listed status and sorts by starts_at.
-- events_person_id_idx exists; it does not cover the sort.
create index if not exists events_person_listed_starts_idx
  on public.events (person_id, starts_at)
  where status in ('on_sale', 'sold_out');

-- Format pages scan approved episodes of one show in publication order.
create index if not exists content_items_show_approved_published_idx
  on public.content_items (show_id, published_at desc, id desc)
  where status = 'approved' and merged_into_id is null;

create or replace function public.fold_program_text(p_text text)
returns text
language sql
immutable
as $$
  select btrim(
    regexp_replace(
      translate(lower(coalesce(p_text, '')), 'ąćęłńóśźż', 'acelnoszz'),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

revoke all on function public.fold_program_text(text) from public;
grant execute on function public.fold_program_text(text) to anon, authenticated, service_role;

create or replace function public.program_part_keys(p_title text, p_show_id bigint)
returns table (primary_key text, anchor_key text)
language plpgsql
immutable
as $$
declare
  raw text := coalesce(p_title, '');
  folded text;
  m text[];
  part int;
  total int;
  name text;
  marker text;
  stem text;
  before text;
  tokens text[];
  kept text[];
  token text;
  n int;
  scope text := case when p_show_id is null then 'none' else 'show:' || p_show_id::text end;
  generic text[] := array['stand', 'up', 'standup', 'video', 'full', 'hd', 'official', 'the'];
begin
  m := regexp_match(
    raw,
    'program[[:space:]]+([^0-9()\[\]{}]{1,40}?)[[:space:]]+([0-9]{1,2})[[:space:]]*/[[:space:]]*([0-9]{1,2})([^0-9]|$)',
    'i'
  );
  if m is not null then
    name := btrim(m[1], ' |-');
    part := m[2]::int;
    total := m[3]::int;
    if char_length(name) >= 2 and part >= 1 and total between 2 and 12 and part <= total then
      primary_key := scope || ':program:' || public.fold_program_text(name);
      anchor_key := null;
      return next;
      return;
    end if;
  end if;

  m := regexp_match(
    raw,
    '(^|[[:space:]|([{-])((część|czesc|cz[.]|cz|odcinek|odc[.]|odc|part|episode|ep[.]))[[:space:]]*([0-9]{1,2}|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)([^[:alnum:]]|$)',
    'i'
  );
  if m is not null then
    marker := m[2] || m[5];
    before := split_part(raw, m[2], 1);
    stem := public.fold_program_text(regexp_replace(raw, m[2] || '[[:space:]]*' || m[5], ' ', 'i'));
    if char_length(stem) >= 3 then
      primary_key := scope || ':stem:' || stem;
    end if;
    folded := public.fold_program_text(before);
    if folded <> '' then
      tokens := regexp_split_to_array(folded, ' ');
      kept := array[]::text[];
      foreach token in array tokens loop
        if token <> '' and not (token = any (generic)) then
          kept := kept || token;
        end if;
      end loop;
      n := coalesce(array_length(kept, 1), 0);
      if n >= 2 then
        anchor_key := scope || ':anchor:' || kept[n - 1] || ' ' || kept[n];
      end if;
    end if;
    if primary_key is not null or anchor_key is not null then
      return next;
      return;
    end if;
  end if;

  m := regexp_match(
    raw,
    '(^|[[:space:]|([{-])([0-9]{1,2})[[:space:]]*/[[:space:]]*([0-9]{1,2})([^0-9]|$)',
    'i'
  );
  if m is not null then
    part := m[3]::int;
    total := m[4]::int;
    if part >= 1 and total between 2 and 12 and part <= total then
      stem := public.fold_program_text(regexp_replace(raw, m[3] || '[[:space:]]*/[[:space:]]*' || m[4], ' '));
      if char_length(stem) >= 3 then
        primary_key := scope || ':stem:' || stem;
        anchor_key := null;
        return next;
        return;
      end if;
    end if;
  end if;

  primary_key := null;
  anchor_key := null;
  return next;
end;
$$;

revoke all on function public.program_part_keys(text, bigint) from public;
grant execute on function public.program_part_keys(text, bigint) to anon, authenticated, service_role;

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
      v.id as content_item_id,
      ci.title,
      v.show_id
    from public.rankable_videos v
    join public.content_items ci on ci.id = v.id
    join public.content_tags ct on ct.content_item_id = v.id
    join public.tags t on t.id = ct.tag_id
    join public.people p on p.id = t.person_id
    where v.is_special
      and t.tag_type = 'person'
      and t.person_id is not null
      and p.is_active is true
  ),
  keyed as (
    select
      person_id,
      name,
      slug,
      photo_url,
      content_item_id,
      (public.program_part_keys(title, show_id)).primary_key as primary_key,
      (public.program_part_keys(title, show_id)).anchor_key as anchor_key
    from tagged
  ),
  counted as (
    select
      keyed.*,
      count(*) filter (where primary_key is not null) over (partition by person_id, primary_key) as primary_n,
      count(*) filter (where anchor_key is not null) over (partition by person_id, anchor_key) as anchor_n
    from keyed
  ),
  programs as (
    select
      person_id,
      name,
      slug,
      photo_url,
      case
        when primary_key is not null and primary_n > 1 then primary_key
        when anchor_key is not null and anchor_n > 1 then anchor_key
        else 'item:' || content_item_id::text
      end as program_key
    from counted
  )
  select
    person_id,
    name,
    slug,
    photo_url,
    count(distinct program_key)::bigint as special_count
  from programs
  group by person_id, name, slug, photo_url
  order by special_count desc, name asc
  limit (select lim from params);
$$;

revoke all on function public.ranking_people_specials(integer) from public;
grant execute on function public.ranking_people_specials(integer) to anon, authenticated, service_role;
