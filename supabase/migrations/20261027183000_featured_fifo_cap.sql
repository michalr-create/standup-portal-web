-- Polecane is a rolling window of 5 approved items.
-- featured_at is when the row was last marked featured.
-- The trigger also caps writes that set is_featured outside the Next.js action
-- (SQL editor, moderator tools). Homepage still limits the visible list to 5.

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS featured_at timestamptz;

UPDATE public.content_items
SET featured_at = created_at
WHERE is_featured IS TRUE
  AND featured_at IS NULL;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.stamp_featured_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_featured IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.is_featured IS DISTINCT FROM TRUE OR NEW.featured_at IS NULL) THEN
    NEW.featured_at := COALESCE(NEW.featured_at, now());
  ELSIF NEW.is_featured IS NOT TRUE THEN
    NEW.featured_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.trim_featured_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_featured IS TRUE AND NEW.status = 'approved' AND NEW.merged_into_id IS NULL THEN
    UPDATE public.content_items
    SET is_featured = false,
        featured_at = NULL
    WHERE id IN (
      SELECT id
      FROM public.content_items
      WHERE is_featured IS TRUE
        AND status = 'approved'
        AND merged_into_id IS NULL
      ORDER BY featured_at DESC NULLS LAST, published_at DESC NULLS LAST, id DESC
      OFFSET 5
    );
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.stamp_featured_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.trim_featured_window() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.stamp_featured_at() TO service_role;
GRANT EXECUTE ON FUNCTION private.trim_featured_window() TO service_role;

DROP TRIGGER IF EXISTS content_items_stamp_featured_at ON public.content_items;
CREATE TRIGGER content_items_stamp_featured_at
  BEFORE INSERT OR UPDATE OF is_featured, featured_at ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp_featured_at();

DROP TRIGGER IF EXISTS content_items_trim_featured_window ON public.content_items;
CREATE TRIGGER content_items_trim_featured_window
  AFTER INSERT OR UPDATE OF is_featured, featured_at, status, merged_into_id ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION private.trim_featured_window();

CREATE INDEX IF NOT EXISTS content_items_featured_window_idx
  ON public.content_items (featured_at DESC NULLS LAST, published_at DESC NULLS LAST, id DESC)
  WHERE is_featured IS TRUE AND status = 'approved' AND merged_into_id IS NULL;

NOTIFY pgrst, 'reload schema';
