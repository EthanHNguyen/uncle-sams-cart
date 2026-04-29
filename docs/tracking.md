# Real tracking for Uncle Sam's Cart

The live app is a static GitHub Pages export. Static pages can count local browser events, but they cannot produce trustworthy aggregate analytics by themselves. Real tracking needs a server-side collector or a third-party analytics product.

## Recommended path

Use a privacy-light analytics endpoint and track only aggregate public events:

- `page_view`
- `share_receipt_success`
- `source_click`
- optional `item_id` and `category`

Do **not** track canceled shares as shares. The Web Share API rejects when the user cancels or the browser blocks the sheet, so the app should only send `shareReceipt` after `navigator.share(...)` resolves.

## Current app behavior

`NEXT_PUBLIC_SHARE_EVENT_URL` is supported at build time. If set, the client sends a `sendBeacon`/`fetch(..., keepalive: true)` JSON payload for successful shares and source clicks.

Example payload:

```json
{
  "event": "shareReceipt",
  "app": "uncle-sams-cart",
  "ts": "2026-04-28T00:00:00.000Z",
  "count": 5
}
```

## Good production options

1. **Cloudflare Worker + KV/D1** — best lightweight custom counter for GitHub Pages.
2. **PostHog Cloud** — fastest if you want funnels/referrers and can accept a third-party script.
3. **Plausible/GoatCounter** — simple privacy-friendly page/source/share events.

For this project, use Cloudflare Worker if the goal is a tiny public counter API without turning the toy into an analytics project.
