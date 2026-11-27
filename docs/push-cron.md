# Web Push — cron co 15 minut

Dispatch nie wysyła maili. Woła go tylko Supabase (`pg_cron` + `pg_net`) na
`POST https://parska.pl/api/push/dispatch` z nagłówkiem `x-push-dispatch-secret`.
Sekret leży w Vault pod nazwą `push_dispatch_secret` i ma być taki sam jak
`PUSH_DISPATCH_SECRET` na Vercel. Nie commituj wartości.

Kolejność:

1. Ustaw zmienne na Vercel (produkcja i preview, jeśli testujesz preview):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (`mailto:parska.pl@gmail.com`)
   - `PUSH_DISPATCH_SECRET` (długa losowa wartość)
   - już używane: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
2. Zastosuj ręcznie `supabase/migrations/20261121170000_user_accounts_stage3_push.sql`,
   a potem `supabase/migrations/20261121210000_notification_prefs_notify_shorts.sql`
   (Shorty, `notify_shorts`, domyślnie wyłączone).
3. Wdróż portal. Dopiero potem włącz crona, inaczej job trafi w starą wersję.
4. Włącz w panelu Supabase rozszerzenia `pg_cron` i `pg_net` (pg_net jest już używane przez rewalidację).
5. Wklej SQL poniżej w edytorze SQL.

Klucze VAPID generujesz raz i trzymasz:

```bash
npx web-push generate-vapid-keys
```

Publiczny klucz to `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, prywatny to `VAPID_PRIVATE_KEY`.

Route sam kończy pracę przed limitem funkcji Vercel (budżet 45 s, `maxDuration` 60).
Niedokończony przebieg nie przesuwa kursora, więc następny tick podejmuje resztę.
Pierwszy przebieg, gdy w `push_cursor` nie ma wiersza `dispatch`, zapisuje `ran_at = now()`
i nic nie wysyła.

## SQL

```sql
-- Raz. Jeśli nazwa push_dispatch_secret już jest, nie twórz drugiej.
select vault.create_secret(
  '<PUSH_DISPATCH_SECRET>',
  'push_dispatch_secret',
  'Same value as Vercel PUSH_DISPATCH_SECRET'
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.post_push_dispatch()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  secret text;
begin
  select ds.decrypted_secret
    into secret
    from vault.decrypted_secrets as ds
   where ds.name = 'push_dispatch_secret'
   limit 1;

  if secret is null or btrim(secret) = '' then
    return;
  end if;

  perform net.http_post(
    url := 'https://parska.pl/api/push/dispatch',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-dispatch-secret', secret
    ),
    timeout_milliseconds := 60000
  );
exception
  when others then
    raise warning 'parska push dispatch skipped: %', sqlerrm;
end;
$$;

revoke all on function private.post_push_dispatch() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'parska-push-dispatch') then
    perform cron.unschedule('parska-push-dispatch');
  end if;
end
$$;

select cron.schedule(
  'parska-push-dispatch',
  '*/15 * * * *',
  'select private.post_push_dispatch()'
);
```

Sprawdzenie: `select jobid, jobname, schedule from cron.job where jobname = 'parska-push-dispatch';`

Wyłączenie: `select cron.unschedule('parska-push-dispatch');`
