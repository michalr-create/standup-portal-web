-- Leaf pages /wystep/[id] stay available after the concert.
-- The public listings still hide past rows in the application query.
-- Rows that are not on sale or sold out stay hidden.
-- source_default_people is only ids. Anon already reads sources and people;
-- the junction is what Person.sameAs needs for public YouTube URLs.

drop policy if exists "Public can read listed events" on public.events;
create policy "Public can read listed events"
on public.events
for select
to anon, authenticated
using (
  status in ('on_sale', 'sold_out')
);

drop policy if exists "Public can read listed event ticket links" on public.event_ticket_links;
create policy "Public can read listed event ticket links"
on public.event_ticket_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_ticket_links.event_id
      and events.status in ('on_sale', 'sold_out')
  )
);

do $$
begin
  if to_regclass('public.event_people') is not null then
    execute 'drop policy if exists "Public can read listed event people" on public.event_people';
    execute $policy$
      create policy "Public can read listed event people"
      on public.event_people
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.events
          where events.id = event_people.event_id
            and events.status in ('on_sale', 'sold_out')
        )
      )
    $policy$;
  end if;
end $$;

drop policy if exists "Public can read source default people" on public.source_default_people;
create policy "Public can read source default people"
on public.source_default_people
for select
to anon, authenticated
using (true);
