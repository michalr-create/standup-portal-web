-- Poster for /trasy cards. Nullable: Going and other sources often have no image,
-- and the card then uses a typographic 4:3 slot. Kupbilecik og:image is filled
-- by the worker (standup-portal-worker), which hotlinks the URL.
-- Already applied on the hosted project; IF NOT EXISTS keeps a replay safe.

alter table public.events
  add column if not exists image_url text;
