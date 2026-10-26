-- Paid specials are sold outside YouTube. Public cards read this flag and
-- open content_items.url instead of the in-app player. Existing rows stay free.
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
