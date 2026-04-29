# Uncle Sam's Cart

A funny, source-linked public-data receipt for real government shopping errands on SAM.gov.

**Real records. Weird carts.**

## What this is

Uncle Sam's Cart is a static-friendly curiosity app. It scans SAM.gov Contract Opportunities data, deterministically ranks surprisingly specific/weird records, and renders them as a public-records shopping receipt people can share.

It is not a GovCon workflow tool, capture CRM, or waste/outrage dashboard.

## Features

- Receipt Rack UI: warm paper, itemized public records, official SAM.gov source links
- Deterministic `weird-items.json` generation — no LLM, no fabricated dollar values
- Native share action and official SAM.gov source links
- Optional aggregate event endpoint via `NEXT_PUBLIC_SHARE_EVENT_URL` for page views, source clicks, successful native shares, and UTM attribution
- Cloudflare Worker + D1 event collector under `workers/` for static-compatible aggregate tracking with origin/content-type checks and sanitized referrers

## Commands

```bash
npm install
npm run lint
npm run build
npm run dev
```

Worker tracking commands, after Cloudflare auth is configured:

```bash
npx wrangler d1 create uncle-sams-cart-events
# Paste the returned database_id into wrangler.toml.
npm run worker:d1:schema
# Existing DBs that predate pageView/UTM tracking: run once before deploy.
npm run worker:d1:migrate:analytics
npm run worker:deploy
```

Then set the repository Actions variable:

```bash
gh variable set NEXT_PUBLIC_SHARE_EVENT_URL --body 'https://uncle-sams-cart-events.<your-subdomain>.workers.dev'
```

The Pages workflow injects that public URL into the static Next build.

Generate weird items after SAM.gov data exists:

```bash
python3 scripts/ingest-sam.py
python3 scripts/build-weird-items.py
```

## Data note

The committed app uses `public/data/weird-items.json`, a compact source-linked artifact. Large SAM.gov bulk extracts should stay in `data/` and remain uncommitted.
