-- Public address for an approved special: /specjale/{slug}.
-- Null on every other row. The raw title stays the slug source; display-title
-- cleaning must not be written back here. Id 47 is the manual duplicate of
-- YouTube 22YkF1zr_nk (canonical row 3102) and never receives a slug.
-- content_slugify matches lib/slugify.ts: lower, ł/Ł -> l, NFD, strip marks.

alter table public.content_items
  add column if not exists slug text;

comment on column public.content_items.slug is
  'Public /specjale/{slug} for an approved special. Null otherwise. Derived from the raw title, never from the cleaned display title.';

create unique index if not exists content_items_slug_key
  on public.content_items (slug)
  where slug is not null;

-- Strip U+0300..U+036F by code point. A regex range would follow LC_CTYPE and
-- could disagree with the JavaScript class in lib/slugify.ts.
create or replace function public.content_slugify(input text)
returns text
language plpgsql
immutable
strict
as $$
declare
  folded text;
  stripped text := '';
  i integer;
  ch text;
  cp integer;
  slug text;
begin
  folded := normalize(translate(lower(input), 'Łł', 'll'), nfd);
  for i in 1..char_length(folded) loop
    ch := substr(folded, i, 1);
    cp := ascii(ch);
    if cp between 768 and 879 then
      continue;
    end if;
    stripped := stripped || ch;
  end loop;
  slug := btrim(regexp_replace(stripped, '[^a-z0-9]+', '-', 'g'), '-');
  if slug = '' then
    return null;
  end if;
  return slug;
end;
$$;

comment on function public.content_slugify(text) is
  'ASCII slug. ł/Ł become l before NFD, matching lib/slugify.ts.';

create or replace function public.youtube_video_id(url text, external_id text)
returns text
language plpgsql
immutable
as $$
declare
  found text;
  pattern text;
  patterns text[] := array[
    '[?&]v=([A-Za-z0-9_-]{11})',
    'youtu\.be/([A-Za-z0-9_-]{11})',
    'youtube\.com/shorts/([A-Za-z0-9_-]{11})',
    'youtube\.com/embed/([A-Za-z0-9_-]{11})'
  ];
begin
  if url is not null and btrim(url) <> '' then
    foreach pattern in array patterns loop
      found := substring(url from pattern);
      if found is not null and found ~ '^[A-Za-z0-9_-]{11}$' then
        return found;
      end if;
    end loop;
  end if;
  if external_id ~ '^[A-Za-z0-9_-]{11}$' then
    return external_id;
  end if;
  return null;
end;
$$;

comment on function public.youtube_video_id(text, text) is
  '11-character YouTube id from the URL, then from external_id. Matches lib/special-slug.ts.';

-- Backfill only approved, unmerged specials. Skip id 47. When two rows share
-- a YouTube id, keep the more complete one (runtime and description, then
-- older published_at, then lower id). Slug collisions get -{id}.
do $$
declare
  rec record;
  base text;
  candidate text;
  reserved text[] := array['admin', 'api', 'dodaj', 'feed', 'index', 'page', 'robots', 'rss', 'sitemap'];
begin
  update public.content_items
  set slug = null
  where id = 47
    and slug is not null;

  for rec in
    with tagged as (
      select
        ci.id,
        ci.title,
        ci.url,
        ci.external_id,
        ci.description,
        ci.duration_seconds,
        ci.published_at,
        ci.slug
      from public.content_items ci
      where ci.status = 'approved'
        and ci.merged_into_id is null
        and ci.id <> 47
        and exists (
          select 1
          from public.content_tags ct
          join public.tags t on t.id = ct.tag_id
          where ct.content_item_id = ci.id
            and t.slug = 'special'
            and t.tag_type = 'topic'
        )
    ),
    keyed as (
      select tagged.*, public.youtube_video_id(tagged.url, tagged.external_id) as yt
      from tagged
    ),
    ranked as (
      select
        keyed.*,
        row_number() over (
          partition by coalesce(keyed.yt, 'row:' || keyed.id::text)
          order by
            (
              (keyed.duration_seconds is not null and keyed.duration_seconds > 0)::int
              + (length(btrim(coalesce(keyed.description, ''))) > 0)::int
            ) desc,
            keyed.published_at asc nulls last,
            keyed.id asc
        ) as rn
      from keyed
    )
    select id, title, slug
    from ranked
    where rn = 1
    order by id
  loop
    if rec.slug is not null then
      continue;
    end if;

    base := public.content_slugify(rec.title);
    candidate := null;

    if base is not null
      and base ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and not (base = any(reserved))
      and not exists (select 1 from public.content_items where slug = base)
    then
      candidate := base;
    end if;

    if candidate is null
      and base is not null
      and base ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and not (base = any(reserved))
    then
      candidate := base || '-' || rec.id::text;
      if exists (select 1 from public.content_items where slug = candidate) then
        candidate := null;
      end if;
    end if;

    if candidate is null then
      candidate := rec.id::text;
      if exists (select 1 from public.content_items where slug = candidate) then
        raise exception 'content slug collision for id %', rec.id;
      end if;
    end if;

    update public.content_items
    set slug = candidate
    where id = rec.id
      and slug is null;
  end loop;
end;
$$;
