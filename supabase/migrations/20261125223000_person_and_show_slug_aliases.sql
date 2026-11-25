-- Apply BEFORE deploying the app that reads these tables.
-- Old /standuper/{slug} and /format/{slug} stay as aliases, so a later rename
-- still 308s to the row's current slug. Canonical pages, the sitemap, and
-- in-app links read people.slug / shows.slug only.
--
-- The previous slugify dropped ł/Ł (they do not decompose under NFD).
-- Rows below are only the ones where a letter disappeared. Each people
-- update is pinned to that person's id, so a colliding slug cannot move
-- another row. Confirmed ids include 15 (Chałupka), 27 (Rafał Rutkowski),
-- 114 (Pałubski), 99 (Błażej Krajewski), 25 (Michał Kutek) and 29 (Rafał Banaś;
-- ś is already s in rafa-banas, only the dropped ł is restored).
-- ukasz-kowalski is id 12. Left unchanged: people id 2 (lotek), 1 (rafal-paczes),
-- 168 (michal-kempa), 162 (lukasz-kozlowski), and shows whose ł is already l
-- (id 51 a-sluchaj-tego, id 38 w-sluzbie-ludzkosci).
-- Each update checks the target is free, then the trigger stores the old slug
-- and moves the matching person tag.

create table public.people_slug_aliases (
  id bigint generated always as identity primary key,
  slug text not null,
  person_id bigint not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint people_slug_aliases_slug_key unique (slug),
  constraint people_slug_aliases_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index people_slug_aliases_person_id_idx
  on public.people_slug_aliases (person_id);

comment on table public.people_slug_aliases is
  'Historical /standuper/{slug}. Redirect 308 to people.slug. A later rename inserts another row.';

create table public.show_slug_aliases (
  id bigint generated always as identity primary key,
  slug text not null,
  show_id bigint not null references public.shows (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint show_slug_aliases_slug_key unique (slug),
  constraint show_slug_aliases_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index show_slug_aliases_show_id_idx
  on public.show_slug_aliases (show_id);

comment on table public.show_slug_aliases is
  'Historical /format/{slug}. Redirect 308 to shows.slug. A later rename inserts another row.';

alter table public.people_slug_aliases enable row level security;
alter table public.show_slug_aliases enable row level security;

create policy "Public can read person slug aliases"
  on public.people_slug_aliases
  for select
  to anon, authenticated
  using (true);

create policy "Public can read show slug aliases"
  on public.show_slug_aliases
  for select
  to anon, authenticated
  using (true);

revoke all on table public.people_slug_aliases from public, anon, authenticated;
revoke all on table public.show_slug_aliases from public, anon, authenticated;
grant select on table public.people_slug_aliases to anon, authenticated;
grant select on table public.show_slug_aliases to anon, authenticated;
grant select, insert, update, delete on table public.people_slug_aliases to service_role;
grant select, insert, update, delete on table public.show_slug_aliases to service_role;

revoke all on sequence public.people_slug_aliases_id_seq from public, anon, authenticated;
revoke all on sequence public.show_slug_aliases_id_seq from public, anon, authenticated;
grant usage, select on sequence public.people_slug_aliases_id_seq to service_role;
grant usage, select on sequence public.show_slug_aliases_id_seq to service_role;

create or replace function public.reject_aliased_person_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is not null and exists (
    select 1 from public.people_slug_aliases where slug = new.slug
  ) then
    raise exception 'person slug % is already an alias', new.slug
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

create or replace function public.archive_person_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is not distinct from old.slug then
    return null;
  end if;

  if new.slug is not null and exists (
    select 1
    from public.people_slug_aliases
    where slug = new.slug
      and person_id <> new.id
  ) then
    raise exception 'person slug % is already an alias', new.slug
      using errcode = 'unique_violation';
  end if;

  if new.slug is not null and exists (
    select 1
    from public.tags
    where tag_type = 'person'
      and slug = new.slug
      and person_id is distinct from new.id
  ) then
    raise exception 'person tag slug % is already taken', new.slug
      using errcode = 'unique_violation';
  end if;

  delete from public.people_slug_aliases
  where person_id = new.id
    and slug = new.slug;

  if old.slug is not null and old.slug is distinct from new.slug then
    insert into public.people_slug_aliases (slug, person_id)
    values (old.slug, new.id);
  end if;

  if new.slug is not null and old.slug is not null then
    update public.tags
    set slug = new.slug
    where person_id = new.id
      and tag_type = 'person'
      and slug = old.slug;
  end if;

  return null;
end;
$$;

create or replace function public.reject_live_person_alias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.people where slug = new.slug) then
    raise exception 'alias % is a live person slug', new.slug
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

create or replace function public.reject_aliased_show_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is not null and exists (
    select 1 from public.show_slug_aliases where slug = new.slug
  ) then
    raise exception 'show slug % is already an alias', new.slug
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

create or replace function public.archive_show_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is not distinct from old.slug then
    return null;
  end if;

  if new.slug is not null and exists (
    select 1
    from public.show_slug_aliases
    where slug = new.slug
      and show_id <> new.id
  ) then
    raise exception 'show slug % is already an alias', new.slug
      using errcode = 'unique_violation';
  end if;

  delete from public.show_slug_aliases
  where show_id = new.id
    and slug = new.slug;

  if old.slug is not null and old.slug is distinct from new.slug then
    insert into public.show_slug_aliases (slug, show_id)
    values (old.slug, new.id);
  end if;

  return null;
end;
$$;

create or replace function public.reject_live_show_alias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.shows where slug = new.slug) then
    raise exception 'alias % is a live show slug', new.slug
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

comment on function public.archive_person_slug() is
  'After people.slug changes, keep the previous slug as a 308 alias and move the person tag.';

comment on function public.archive_show_slug() is
  'After shows.slug changes, keep the previous slug as a 308 alias.';

revoke all on function public.reject_aliased_person_slug() from public, anon, authenticated;
revoke all on function public.archive_person_slug() from public, anon, authenticated;
revoke all on function public.reject_live_person_alias() from public, anon, authenticated;
revoke all on function public.reject_aliased_show_slug() from public, anon, authenticated;
revoke all on function public.archive_show_slug() from public, anon, authenticated;
revoke all on function public.reject_live_show_alias() from public, anon, authenticated;

grant execute on function public.reject_aliased_person_slug() to service_role;
grant execute on function public.archive_person_slug() to service_role;
grant execute on function public.reject_live_person_alias() to service_role;
grant execute on function public.reject_aliased_show_slug() to service_role;
grant execute on function public.archive_show_slug() to service_role;
grant execute on function public.reject_live_show_alias() to service_role;

drop trigger if exists people_reject_aliased_slug on public.people;
create trigger people_reject_aliased_slug
  before insert on public.people
  for each row
  execute function public.reject_aliased_person_slug();

drop trigger if exists people_archive_slug on public.people;
create trigger people_archive_slug
  after update of slug on public.people
  for each row
  execute function public.archive_person_slug();

drop trigger if exists people_slug_aliases_reject_live on public.people_slug_aliases;
create trigger people_slug_aliases_reject_live
  before insert or update of slug on public.people_slug_aliases
  for each row
  execute function public.reject_live_person_alias();

drop trigger if exists shows_reject_aliased_slug on public.shows;
create trigger shows_reject_aliased_slug
  before insert on public.shows
  for each row
  execute function public.reject_aliased_show_slug();

drop trigger if exists shows_archive_slug on public.shows;
create trigger shows_archive_slug
  after update of slug on public.shows
  for each row
  execute function public.archive_show_slug();

drop trigger if exists show_slug_aliases_reject_live on public.show_slug_aliases;
create trigger show_slug_aliases_reject_live
  before insert or update of slug on public.show_slug_aliases
  for each row
  execute function public.reject_live_show_alias();

do $people$
declare
  missing text;
  taken text;
  renamed integer;
begin
  create temporary table person_slug_renames (
    person_id bigint primary key,
    old_slug text not null unique,
    new_slug text not null unique
  ) on commit drop;

  insert into person_slug_renames (person_id, old_slug, new_slug) values
    (99, 'b-azej-krajewski', 'blazej-krajewski'),
    (41, 'bart-omiej-korbel', 'bartlomiej-korbel'),
    (72, 'bartosz-m-ynarski', 'bartosz-mlynarski'),
    (31, 'ewa-b-achnio', 'ewa-blachnio'),
    (91, 'gawe-feliga', 'gawel-feliga'),
    (103, 'joanna-ko-aczkowska', 'joanna-kolaczkowska'),
    (48, 'kamil-kozie', 'kamil-koziel'),
    (125, 'kuba-ruzylo', 'kuba-ruzyllo'),
    (117, 'mariusz-ka-amaga', 'mariusz-kalamaga'),
    (83, 'mateusz-p-ocha', 'mateusz-plocha'),
    (47, 'micha-gniazdowski', 'michal-gniazdowski'),
    (81, 'micha-juszczak', 'michal-juszczak'),
    (25, 'micha-kutek', 'michal-kutek'),
    (58, 'micha-leja', 'michal-leja'),
    (114, 'micha-pa-ubski', 'michal-palubski'),
    (15, 'pawe-cha-upka', 'pawel-chalupka'),
    (94, 'pawe-domaga-a', 'pawel-domagala'),
    (85, 'pawe-konkiel', 'pawel-konkiel'),
    (105, 'pawe-scierski', 'pawel-scierski'),
    (29, 'rafa-banas', 'rafal-banas'),
    (27, 'rafa-rutkowski', 'rafal-rutkowski'),
    (59, 'rafa-sumowski', 'rafal-sumowski'),
    (24, 'tomek-ko-ecki', 'tomek-kolecki'),
    (12, 'ukasz-kowalski', 'lukasz-kowalski'),
    (82, 'ukasz-wolski', 'lukasz-wolski');

  if (select count(*) from person_slug_renames) <> 25 then
    raise exception 'expected 25 person slug renames';
  end if;

  select string_agg(r.old_slug, ', ' order by r.old_slug)
    into missing
  from person_slug_renames r
  left join public.people p on p.id = r.person_id and p.slug = r.old_slug
  where p.id is null;

  if missing is not null then
    raise exception 'people slug rename aborted, pinned id does not have the old slug: %', missing;
  end if;

  select string_agg(r.new_slug || ' held by ' || p.slug, ', ' order by r.new_slug)
    into taken
  from person_slug_renames r
  join public.people p on p.slug = r.new_slug and p.id <> r.person_id;

  if taken is not null then
    raise exception 'people slug rename aborted, target slug already taken: %', taken;
  end if;

  select string_agg(r.new_slug, ', ' order by r.new_slug)
    into taken
  from person_slug_renames r
  join public.people src on src.id = r.person_id and src.slug = r.old_slug
  join public.tags t
    on t.tag_type = 'person'
   and t.slug = r.new_slug
   and t.person_id is distinct from src.id;

  if taken is not null then
    raise exception 'people slug rename aborted, person tag slug already taken: %', taken;
  end if;

  select string_agg(r.new_slug, ', ' order by r.new_slug)
    into taken
  from person_slug_renames r
  join public.people_slug_aliases a on a.slug = r.new_slug;

  if taken is not null then
    raise exception 'people slug rename aborted, target slug is already an alias: %', taken;
  end if;

  update public.people p
  set slug = r.new_slug
  from person_slug_renames r
  where p.id = r.person_id
    and p.slug = r.old_slug;

  get diagnostics renamed = row_count;
  if renamed <> 25 then
    raise exception 'people slug rename aborted, updated % rows instead of 25', renamed;
  end if;

  if exists (
    select 1
    from public.people p
    join person_slug_renames r on p.slug = r.old_slug
  ) then
    raise exception 'people slug rename aborted, an old slug is still live';
  end if;

  if (
    select count(*)
    from public.people_slug_aliases a
    join person_slug_renames r on r.old_slug = a.slug
  ) <> 25 then
    raise exception 'people slug rename aborted, aliases were not recorded';
  end if;

  if exists (
    select 1
    from public.people_slug_aliases a
    join public.people p on p.slug = a.slug
  ) then
    raise exception 'people slug rename aborted, an alias matches a live slug';
  end if;

  if exists (
    select 1
    from public.tags t
    join public.people p on p.id = t.person_id
    join person_slug_renames r on r.new_slug = p.slug
    where t.tag_type = 'person'
      and t.slug = r.old_slug
  ) then
    raise exception 'people slug rename aborted, a person tag kept the old slug';
  end if;

  if exists (
    select 1
    from person_slug_renames r
    join public.people p on p.id = r.person_id
    where p.slug is distinct from r.new_slug
  ) then
    raise exception 'people slug rename aborted, a pinned id did not receive its new slug';
  end if;

  if (select slug from public.people where id = 2) is distinct from 'lotek' then
    raise exception 'lotek must stay lotek';
  end if;
  if (select slug from public.people where id = 1) is distinct from 'rafal-paczes' then
    raise exception 'rafal-paczes must stay';
  end if;
  if (select slug from public.people where id = 168) is distinct from 'michal-kempa' then
    raise exception 'michal-kempa must stay';
  end if;
  if (select slug from public.people where id = 162) is distinct from 'lukasz-kozlowski' then
    raise exception 'lukasz-kozlowski must stay';
  end if;
end
$people$;

do $shows$
declare
  missing text;
  taken text;
  renamed integer;
begin
  create temporary table show_slug_renames (
    old_slug text primary key,
    new_slug text not null unique
  ) on commit drop;

  insert into show_slug_renames (old_slug, new_slug) values
    ('gadajaca-g-owa-bartosz-zalewski', 'gadajaca-glowa-bartosz-zalewski'),
    ('hamburger-show-b-azej-krajewski', 'hamburger-show-blazej-krajewski'),
    ('micha-leja-show', 'michal-leja-show'),
    ('ods-uch-ukasz-kowalski', 'odsluch-lukasz-kowalski'),
    ('pyta-kacper-rucinski', 'pytal-kacper-rucinski'),
    ('smieszny-cz-owiek-karol-kopiec-i-goscie', 'smieszny-czlowiek-karol-kopiec-i-goscie'),
    ('z-kartki-micha-leja', 'z-kartki-michal-leja');

  if (select count(*) from show_slug_renames) <> 7 then
    raise exception 'expected 7 show slug renames';
  end if;

  select string_agg(r.old_slug, ', ' order by r.old_slug)
    into missing
  from show_slug_renames r
  left join public.shows s on s.slug = r.old_slug
  where s.id is null;

  if missing is not null then
    raise exception 'show slug rename aborted, missing source slug: %', missing;
  end if;

  select string_agg(r.new_slug || ' held by ' || s.slug, ', ' order by r.new_slug)
    into taken
  from show_slug_renames r
  join public.shows s on s.slug = r.new_slug and s.slug <> r.old_slug;

  if taken is not null then
    raise exception 'show slug rename aborted, target slug already taken: %', taken;
  end if;

  select string_agg(r.new_slug, ', ' order by r.new_slug)
    into taken
  from show_slug_renames r
  join public.show_slug_aliases a on a.slug = r.new_slug;

  if taken is not null then
    raise exception 'show slug rename aborted, target slug is already an alias: %', taken;
  end if;

  update public.shows s
  set slug = r.new_slug
  from show_slug_renames r
  where s.slug = r.old_slug;

  get diagnostics renamed = row_count;
  if renamed <> 7 then
    raise exception 'show slug rename aborted, updated % rows instead of 7', renamed;
  end if;

  if exists (
    select 1
    from public.shows s
    join show_slug_renames r on s.slug = r.old_slug
  ) then
    raise exception 'show slug rename aborted, an old slug is still live';
  end if;

  if (
    select count(*)
    from public.show_slug_aliases a
    join show_slug_renames r on r.old_slug = a.slug
  ) <> 7 then
    raise exception 'show slug rename aborted, aliases were not recorded';
  end if;

  if exists (
    select 1
    from public.show_slug_aliases a
    join public.shows s on s.slug = a.slug
  ) then
    raise exception 'show slug rename aborted, an alias matches a live slug';
  end if;

  if (select slug from public.shows where id = 51) is distinct from 'a-sluchaj-tego' then
    raise exception 'a-sluchaj-tego already maps ł to l and must stay';
  end if;
  if (select slug from public.shows where id = 38) is distinct from 'w-sluzbie-ludzkosci' then
    raise exception 'w-sluzbie-ludzkosci already maps ł to l and must stay';
  end if;
  if (select slug from public.shows where id = 53) is distinct from 'hamburger-show' then
    raise exception 'hamburger-show must stay distinct from the Błażej format';
  end if;
end
$shows$;
