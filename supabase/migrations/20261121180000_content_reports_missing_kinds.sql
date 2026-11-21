-- Missing show dates and missing stand-up comedians, on the same reports
-- table. Apply this file yourself. It does not run from the app.
-- Safe to re-run. Existing missing_video, wrong_meta, and new_open_mic rows
-- still match the checks below; nothing is rewritten.

alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check check (
  kind in (
    'missing_video',
    'wrong_meta',
    'new_open_mic',
    'missing_event',
    'missing_person'
  )
);

alter table public.content_reports drop constraint if exists content_reports_shape_check;
alter table public.content_reports add constraint content_reports_shape_check check (
  (kind = 'missing_video' and url is not null and content_item_id is null)
  or (kind = 'wrong_meta' and content_item_id is not null and char_length(btrim(message)) > 0)
  or (kind = 'new_open_mic' and char_length(btrim(message)) > 0)
  or (kind = 'missing_event' and content_item_id is null and char_length(btrim(message)) > 0)
  or (kind = 'missing_person' and content_item_id is null and char_length(btrim(message)) > 0)
);
