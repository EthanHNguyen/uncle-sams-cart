# Real tracking for Uncle Sam's Cart

The live app is a static GitHub Pages export. Static pages can emit browser events, but they cannot produce trustworthy aggregate analytics by themselves. Real tracking uses a server-side collector.

## Implemented collector

This repo includes a Cloudflare Worker + D1 event collector:

- Worker: `workers/share-events.js`
- Base D1 schema: `workers/schema.sql`
- Analytics migration: `workers/migrations/0002_pageview_utm_columns.sql`
- Wrangler config: `wrangler.toml`
- GitHub Pages build env: `.github/workflows/pages.yml` reads `vars.NEXT_PUBLIC_SHARE_EVENT_URL`

The app still works if `NEXT_PUBLIC_SHARE_EVENT_URL` is unset. In that case event tracking is a no-op.

## What gets tracked

Only aggregate public interaction events:

- `pageView` — sent once per page load so shares/source-clicks have a denominator
- `shareReceipt` — sent only after `navigator.share(...)` resolves successfully
- `sourceClick` — sent when a user clicks an official SAM.gov source link

The client sends the current path/query so the Worker can extract UTM attribution. The Worker stores a sanitized path and UTM fields, not full query strings.

Do **not** track canceled shares as shares. The Web Share API rejects when the user cancels or the browser blocks the sheet, so the app sends `shareReceipt` only after the native share promise resolves.

Example payload:

```json
{
  "event": "pageView",
  "app": "uncle-sams-cart",
  "ts": "2026-04-28T00:00:00.000Z",
  "path": "/uncle-sams-cart/?utm_source=uncle_sams_cart&utm_medium=share&utm_campaign=weird_sam_receipt"
}
```

## Collector hardening

The Worker now applies the v1 engineering-review patches:

- rejects POSTs with missing/disallowed `Origin`
- accepts only `application/json`
- rejects oversized bodies above 4 KB
- accepts only `pageView`, `shareReceipt`, and `sourceClick`
- sanitizes `Referer` to origin + pathname only
- stores sanitized `path` and parsed `utm_source`, `utm_medium`, `utm_campaign`
- checks `navigator.sendBeacon(...)` return value and falls back to `fetch(..., keepalive: true)` when queueing fails
- supports `/summary` authorization via a bearer token

## Cloudflare setup

Authenticate Wrangler first:

```bash
npx wrangler login
```

Create the D1 database:

```bash
npx wrangler d1 create uncle-sams-cart-events
```

Paste the returned `database_id` into `wrangler.toml`.

Apply the schema for a fresh database:

```bash
npm run worker:d1:schema
```

For an existing database that predates `pageView`/UTM tracking, run the additive migration once:

```bash
npm run worker:d1:migrate:analytics
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

Daily event rollup:

```sql
select date(created_at) as day, event, count(*) as total
from events
group by day, event
order by day desc, event;
```

Share/source conversion from page views:

```sql
with totals as (
  select event, count(*) as total
  from events
  group by event
)
select
  (select total from totals where event = 'pageView') as page_views,
  (select total from totals where event = 'sourceClick') as source_clicks,
  (select total from totals where event = 'shareReceipt') as shares;
```

UTM campaign counts:

```sql
select utm_source, utm_medium, utm_campaign, count(*) as views
from events
where event = 'pageView'
group by utm_source, utm_medium, utm_campaign
order by views desc;
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
select event, created_at, item_id, category, path, utm_source
from events
order by id desc
limit 20;
```

The Worker also exposes `/summary`. If `SUMMARY_TOKEN` is set on the Worker, call it with a bearer token:

```bash
curl -H 'Authorization: Bearer <token>' https://uncle-sams-cart-events.<your-subdomain>.workers.dev/summary
```
