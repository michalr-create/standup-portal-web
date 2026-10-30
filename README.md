# standup-portal-web
Portal webowy dla agregatora stand-upu

## On-demand revalidation

Public pages keep ISR (`revalidate` 120, including the root layout) as a fallback. Approving or editing `public.content_items` in Supabase — status, category, show, or tags in `content_tags` — queues a POST to `https://parska.pl/api/revalidate` and refreshes the affected paths within seconds.

`REVALIDATE_SECRET` on Vercel and the Supabase Vault secret `revalidate_secret` must be the same value. Do not commit it. Create the vault row yourself (the migration only reads it):

```sql
select vault.create_secret(
  '<REVALIDATE_SECRET>',
  'revalidate_secret',
  'Same value as Vercel REVALIDATE_SECRET'
);
```
