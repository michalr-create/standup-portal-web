-- First-party product events (kup_bilet and the rest of the measurement spec).
-- Apply this file yourself in the Supabase SQL editor. The app does not run it.
--
-- The table stores no user_id, no email, and no IP, and it has no foreign key
-- to auth.users. Retention: 24 months (delete or archive from the SQL editor;
-- nothing in the portal purges rows automatically).
--
-- Row level security is on and there are no policies for anon or authenticated.
-- Only the service role, which bypasses RLS, may insert. The browser cannot read
-- or write this table.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  props jsonb not null default '{}'::jsonb,
  constraint analytics_events_name_check check (char_length(name) between 1 and 64),
  constraint analytics_events_props_object check (jsonb_typeof(props) = 'object'),
  constraint analytics_events_props_size check (pg_column_size(props) <= 4096)
);

comment on table public.analytics_events is
  'Anonymous product events. No user_id, email, or IP. Retention: 24 months.';

comment on column public.analytics_events.props is
  'Dictionary fields from the measurement spec only. No email, user id, or IP.';

alter table public.analytics_events enable row level security;

revoke all on table public.analytics_events from anon, authenticated;

grant select, insert on table public.analytics_events to service_role;

create index if not exists analytics_events_name_created_at_idx
  on public.analytics_events (name, created_at desc);
