# Design Shotgun: Uncle Sam's Cart

## Source of truth

Uncle Sam's Cart is **not** a serious GovCon workflow. It is a funny, source-linked curiosity artifact for the weirdest real things the U.S. government is shopping for on SAM.gov.

The target reaction:

> There is no way this is real... wait, it is?

## Constraints

- Public-data toy first, not capture software.
- One page for v1.
- No accounts, search, saved carts, maps, filters, comments, or all-time database.
- Every item links to the official source.
- Tone: funny + credible, not outrage bait.
- Share tracking is part of the wedge: copy receipt, share receipt, source clicks.
- Static-friendly: local/client tracking by default, optional analytics endpoint later.

## Four directions

### A. Receipt Rack — selected

**Metaphor:** checkout receipt for real public records.

- Warm receipt paper.
- Monospace line items.
- “UNCLE SAM'S CART · TODAY'S RECEIPT.”
- Clear action: Share receipt.
- Best screenshot shape for social/group chats.

Why this wins: the product name and the interaction finally collapse into one thing. The receipt is both the UI and the viral object.

### B. Viral Feed

**Metaphor:** ranked social list.

- Big rankings.
- “Yes, these are real.”
- Maximum curiosity per scroll.
- Strongest for short attention spans, but less distinctive than the receipt.

Use pieces of this: top-of-page hook and ranked order.

### C. Evidence Desk

**Metaphor:** sourced public-record desk.

- Dark credibility surface.
- “Public records only.”
- Makes source links feel serious.
- Best for media/blog trust, but slightly less funny.

Use pieces of this: visible “source-backed” affordances and non-ragebait disclaimers.

### D. Cabinet of Curiosities

**Metaphor:** weekly museum/editorial column.

- More literary.
- “Specimens” instead of cart items.
- Good future content format.
- Less instantly legible as a share mechanic.

Hold for later if the app turns into a recurring newsletter/blog/social series.

## Build choice

Implement **A: Receipt Rack**, borrowing the strongest hook from **B** and credibility cues from **C**.

## V1 screen structure

1. Hero
   - `Uncle Sam's Cart`
   - `The weirdest things Uncle Sam is shopping for today.`
   - `Real records. Weird carts.`
   - Source/freshness chip: `SAM.gov bulk CSV · N active opportunities`
2. “Today's receipt” panel
   - 10–20 weird line items.
   - Each item has title, agency, reason badge, official source link.
3. Receipt builder
   - Default all items included, or “Add to receipt” cards if interaction is needed.
   - Copy/share buttons are the primary actions.
4. Tracking strip
   - Local counters: copy receipt, native/share fallback, source clicks.
   - Optional `NEXT_PUBLIC_SHARE_EVENT_URL` beacon later.

## Visual system

- Warm parchment background, not sterile dashboard white.
- Receipt card: off-white, dashed separators, monospace details.
- CTA: near-black primary button; secondary warm-tan button.
- Accent: one red “Yes, this is real” badge, not a full outrage palette.
- Mobile-first: receipt should look good in a phone screenshot.

## Implementation note

The current repo had a serious procurement-cart direction. Replace it; do not evolve it.

The build should generate a deterministic `public/data/weird-items.json` from SAM.gov data, then render the static receipt from that file.
