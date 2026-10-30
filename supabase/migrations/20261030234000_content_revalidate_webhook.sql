-- Refresh parska.pl when a moderator edits public.content_items in the dashboard.
-- pg_net only queues the request; it is sent after commit. Errors are caught
-- (and logged as a warning) so the moderator's write cannot fail.
--
-- public.content_items has no tags column. Tag links live in public.content_tags,
-- so tag changes have their own statement trigger. The secret is NOT stored here:
-- private.post_revalidate reads vault.decrypted_secrets.name = 'revalidate_secret'
-- at call time (same value as Vercel REVALIDATE_SECRET). If that row is missing,
-- the function returns without calling the site.
--
-- DELETE on content_items is BEFORE, not AFTER. content_tags cascades on delete,
-- and that cascade runs before an AFTER DELETE trigger, which would hide the
-- linked people and the "special" tag. BEFORE DELETE still only queues HTTP;
-- it does not wait on parska.pl. RETURN OLD is required so the delete proceeds.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.post_revalidate(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  secret text;
BEGIN
  SELECT ds.decrypted_secret
    INTO secret
    FROM vault.decrypted_secrets AS ds
   WHERE ds.name = 'revalidate_secret'
   LIMIT 1;

  IF secret IS NULL OR btrim(secret) = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://parska.pl/api/revalidate',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-revalidate-secret', secret
    ),
    timeout_milliseconds := 5000
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'parska revalidate webhook skipped: %', SQLERRM;
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_content_revalidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_item_id bigint;
  tag_context jsonb;
  payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'approved' THEN
      RETURN NEW;
    END IF;
    v_item_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id
       AND NEW.show_id IS NOT DISTINCT FROM OLD.show_id THEN
      RETURN NEW;
    END IF;
    v_item_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IS DISTINCT FROM 'approved' THEN
      RETURN OLD;
    END IF;
    v_item_id := OLD.id;
  ELSE
    RETURN NULL;
  END IF;

  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'slug', t.slug,
               'tag_type', t.tag_type,
               'person_slug', p.slug
             )
           ),
           '[]'::jsonb
         )
    INTO tag_context
    FROM public.content_tags AS ct
    JOIN public.tags AS t ON t.id = ct.tag_id
    LEFT JOIN public.people AS p ON p.id = t.person_id
   WHERE ct.content_item_id = v_item_id;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', 'content_items',
    'schema', 'public',
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    'tag_context', coalesce(tag_context, '[]'::jsonb)
  );

  PERFORM private.post_revalidate(payload);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'parska revalidate webhook skipped: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- One webhook per transaction for tag edits. setItemTags deletes then inserts;
-- the delete carries the removed tag ids, and the route reads the links that
-- remain after commit. Later tag statements in the same transaction no-op.
CREATE OR REPLACE FUNCTION private.enqueue_tag_change(item_ids bigint[], tag_ids bigint[], op text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_setting('parska.revalidate_tags_queued', true) = '1' THEN
    RETURN;
  END IF;

  IF item_ids IS NULL OR cardinality(item_ids) = 0 THEN
    RETURN;
  END IF;

  PERFORM private.post_revalidate(
    jsonb_build_object(
      'type', op,
      'table', 'content_tags',
      'schema', 'public',
      'record', NULL,
      'old_record', NULL,
      'content_item_ids', to_jsonb(item_ids),
      'tag_ids', to_jsonb(coalesce(tag_ids, '{}'::bigint[]))
    )
  );

  PERFORM set_config('parska.revalidate_tags_queued', '1', true);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'parska revalidate webhook skipped: %', SQLERRM;
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_content_tags_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  item_ids bigint[];
  tag_ids bigint[];
BEGIN
  SELECT coalesce(array_agg(DISTINCT n.content_item_id), '{}'::bigint[]),
         coalesce(array_agg(DISTINCT n.tag_id), '{}'::bigint[])
    INTO item_ids, tag_ids
    FROM new_rows AS n
    JOIN public.content_items AS ci
      ON ci.id = n.content_item_id
     AND ci.status = 'approved';

  PERFORM private.enqueue_tag_change(item_ids, tag_ids, 'INSERT');
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'parska revalidate webhook skipped: %', SQLERRM;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_content_tags_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  item_ids bigint[];
  tag_ids bigint[];
BEGIN
  SELECT coalesce(array_agg(DISTINCT o.content_item_id), '{}'::bigint[]),
         coalesce(array_agg(DISTINCT o.tag_id), '{}'::bigint[])
    INTO item_ids, tag_ids
    FROM old_rows AS o
    JOIN public.content_items AS ci
      ON ci.id = o.content_item_id
     AND ci.status = 'approved';

  PERFORM private.enqueue_tag_change(item_ids, tag_ids, 'DELETE');
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'parska revalidate webhook skipped: %', SQLERRM;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_content_tags_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  item_ids bigint[];
  tag_ids bigint[];
BEGIN
  SELECT coalesce(array_agg(DISTINCT x.content_item_id), '{}'::bigint[]),
         coalesce(array_agg(DISTINCT x.tag_id), '{}'::bigint[])
    INTO item_ids, tag_ids
    FROM (
      SELECT content_item_id, tag_id FROM old_rows
      UNION
      SELECT content_item_id, tag_id FROM new_rows
    ) AS x
    JOIN public.content_items AS ci
      ON ci.id = x.content_item_id
     AND ci.status = 'approved';

  PERFORM private.enqueue_tag_change(item_ids, tag_ids, 'UPDATE');
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'parska revalidate webhook skipped: %', SQLERRM;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.post_revalidate(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_tag_change(bigint[], bigint[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_content_revalidate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_content_tags_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_content_tags_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_content_tags_update() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.enqueue_content_revalidate() TO service_role;
GRANT EXECUTE ON FUNCTION private.enqueue_content_tags_insert() TO service_role;
GRANT EXECUTE ON FUNCTION private.enqueue_content_tags_delete() TO service_role;
GRANT EXECUTE ON FUNCTION private.enqueue_content_tags_update() TO service_role;

DROP TRIGGER IF EXISTS content_items_revalidate ON public.content_items;
CREATE TRIGGER content_items_revalidate
  AFTER INSERT OR UPDATE OF status, category_id, show_id
  ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION private.enqueue_content_revalidate();

DROP TRIGGER IF EXISTS content_items_revalidate_delete ON public.content_items;
CREATE TRIGGER content_items_revalidate_delete
  BEFORE DELETE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION private.enqueue_content_revalidate();

DROP TRIGGER IF EXISTS content_tags_revalidate_insert ON public.content_tags;
CREATE TRIGGER content_tags_revalidate_insert
  AFTER INSERT ON public.content_tags
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.enqueue_content_tags_insert();

DROP TRIGGER IF EXISTS content_tags_revalidate_delete ON public.content_tags;
CREATE TRIGGER content_tags_revalidate_delete
  AFTER DELETE ON public.content_tags
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.enqueue_content_tags_delete();

DROP TRIGGER IF EXISTS content_tags_revalidate_update ON public.content_tags;
CREATE TRIGGER content_tags_revalidate_update
  AFTER UPDATE ON public.content_tags
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.enqueue_content_tags_update();
