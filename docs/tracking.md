# Real tracking for Uncle Sam's Cart

The live app is a static GitHub Pages export. Static pages can count local browser events, but they cannot produce trustworthy aggregate analytics by themselves. Real tracking needs a server-side collector or a third-party analytics product.

## Implemented collector

This repo includes a Cloudflare Worker + D1 event collector:

- Worker: `workers/share-events.js`
- D1 schema: `workers/schema.sql`
- Wrangler config: `wrangler.toml`
- GitHub Pages build env: `.github/workflows/pages.yml` reads `vars.NEXT_PUBLIC_SHARE_EVENT_URL`

The app still works if `NEXT_PUBLIC_SHARE_EVENT_URL` is unset. In that case event tracking is a no-op.

## What gets tracked

Only aggregate public interaction events:

- `shareReceipt` — sent only after `navigator.share(...)` resolves successfully
- `sourceClick` — sent when a user clicks an official SAM.gov source link

Do **not** track canceled shares as shares. The Web Share API rejects when the user cancels or the browser blocks the sheet, so the app sends `shareReceipt` only after the native share promise resolves.

Example payload:

```json
{
  "event": "shareReceipt",
  "app": "uncle-sams-cart",
  "ts": "2026-04-28T00:00:00.000Z",
  "count": 5
}
```

## Cloudflare setup

Authenticate Wrangler first:

```bash
npx wrangler login
```

Create the D1 database:

```bash
npx wrangler d1 create uncle-sams-cart-events
```

Paste the returned `database_id` into `wrangler.toml`, replacing `REPLACE_WITH_D1_DATABASE_ID`.

Apply the schema:

```bash
npm run worker:d1:schema
```

Deploy the Worker:

```bash
npm run worker:deploy
```

Health check:

```bash
curl https://uncle-sams-cart-events.<your-subdomain>.workers.dev/health
```

## GitHub Pages wiring

Set the public event endpoint as a repository Actions variable:

```bash
gh variable set NEXT_PUBLIC_SHARE_EVENT_URL --body 'https://uncle-sams-cart-events.<your-subdomain>.workers.dev'
```

Then trigger/deploy Pages. The workflow passes that value into `npm run build`:

```yaml
NEXT_PUBLIC_SHARE_EVENT_URL: ${{ vars.NEXT_PUBLIC_SHARE_EVENT_URL }}
```

`NEXT_PUBLIC_*` values are intentionally public in the client bundle. Do not put secrets there.

## Querying D1

Totals by event:

```sql
select event, count(*) as total
from events
group by event
order by event;
```

Top source clicks:

```sql
select item_id, category, count(*) as clicks
from events
where event = 'sourceClick'
group by item_id, category
order by clicks desc
limit 10;
```

Recent events:

```sql
select event, created_at, item_id, category
from events
order by id desc
limit 20;
```

The Worker also exposes `/summary`. If `SUMMARY_TOKEN` is set on the Worker, call `/summary?token=...`; otherwise it returns the summary openly.
