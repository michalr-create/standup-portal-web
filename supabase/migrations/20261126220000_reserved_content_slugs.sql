-- Site routes reserved after the special-slug backfill.
-- 20261125190000 already ran and does not know these words.
-- A row that took one of them would hide behind the static page, so suffix it.
-- Safe to re-run: the WHERE clause no longer matches after the first update.

update public.content_items as ci
set slug = ci.slug || '-' || ci.id::text
where ci.slug in ('2026', 'najlepsze', 'za-darmo')
  and not exists (
    select 1
    from public.content_items as other
    where other.slug = ci.slug || '-' || ci.id::text
      and other.id <> ci.id
  );
