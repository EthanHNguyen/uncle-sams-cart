"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import weirdData from "../../public/data/weird-items.json";

type WeirdItem = {
  id: string;
  title: string;
  displayTitle?: string;
  officialTitle?: string;
  punchline?: string;
  agency: string;
  agencyFull: string;
  office: string;
  noticeType: string;
  postedDate: string;
  responseDeadline: string;
  placeOfPerformance: string;
  source: "SAM.gov";
  url: string;
  category: string;
  weirdnessScore: number;
  absurdityBadges: string[];
  displayCategory?: string;
  weirdnessReasons: string[];
  plainEnglish: string;
};

type WeirdPayload = {
  source: string;
  generatedAt: string;
  totalRows: number;
  activeRows: number;
  method: string;
  items: WeirdItem[];
};

type EventName = "pageView" | "shareReceipt" | "sourceClick";

const payload = weirdData as WeirdPayload;

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "date unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
}

function itemTitle(item: WeirdItem) {
  return item.displayTitle ?? item.title;
}

function shortReason(item: WeirdItem) {
  return item.punchline ?? item.weirdnessReasons[0]?.replace(/ signal:/, ":") ?? item.plainEnglish;
}

function itemCategory(item: WeirdItem) {
  return item.displayCategory ?? item.category;
}

function trackingUrl() {
  if (typeof window === "undefined") return "https://ethanhn.com";
  const url = new URL(window.location.href);
  url.searchParams.set("utm_source", "uncle_sams_cart");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "weird_sam_receipt");
  return url.toString();
}

function buildReceipt(items: WeirdItem[]) {
  const lines = [
    "UNCLE SAM'S CART",
    "Actual public records. Very unusual errands.",
    "",
    ...items.map((item, index) => {
      return `${String(index + 1).padStart(2, "0")}. ${itemTitle(item)}\n    ${item.agency} · ${itemCategory(item)}\n    Receipt note: ${shortReason(item)}\n    Official title: ${item.officialTitle ?? item.title}\n    Source: ${item.url}`;
    }),
    "",
    `Sources: SAM.gov bulk Contract Opportunities · ${payload.activeRows.toLocaleString()} public records scanned`,
    trackingUrl(),
  ];
  return lines.join("\n");
}

function currentPathWithUtm() {
  if (typeof window === "undefined") return "/uncle-sams-cart/";
  return `${window.location.pathname}${window.location.search}`;
}

function sendOptionalBeacon(eventName: EventName, data: Record<string, string | number | null> = {}) {
  const endpoint = process.env.NEXT_PUBLIC_SHARE_EVENT_URL;
  if (!endpoint || typeof window === "undefined") return;
  const body = JSON.stringify({ event: eventName, app: "uncle-sams-cart", ts: new Date().toISOString(), path: currentPathWithUtm(), ...data });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, blob)) {
      return;
    }
    void fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  } catch {
    // Tracking must never break the toy.
  }
}

export default function Home() {
  const items = useMemo(() => payload.items.slice(0, 5), []);
  const [toast, setToast] = useState("Ready to make the group chat ask who approved this errand.");

  const pageViewSent = useRef(false);

  useEffect(() => {
    if (pageViewSent.current) return;
    pageViewSent.current = true;
    sendOptionalBeacon("pageView");
  }, []);

  const receiptItems = items;
  const receiptText = useMemo(() => buildReceipt(receiptItems), [receiptItems]);

  async function shareReceipt() {
    const shareData = {
      title: "Uncle Sam's Cart",
      text: `Actual SAM.gov public records, arranged like a checkout receipt because the fish apparently have a federal meal plan.\n\n${receiptText}`,
      url: trackingUrl(),
    };

    if (!navigator.share) {
      setToast("Your browser does not support native sharing. The receipt remains weird and fully source-linked.");
      return;
    }

    try {
      await navigator.share(shareData);
      sendOptionalBeacon("shareReceipt", { count: receiptItems.length });
      setToast("Shared. Democracy has entered the group chat with receipts.");
    } catch {
      setToast("Share canceled. No victory lap, no phantom counter.");
    }
  }

  function sourceClicked(item: WeirdItem) {
    sendOptionalBeacon("sourceClick", { id: item.id, category: itemCategory(item) });
  }

  return (
    <main className="min-h-screen bg-[#f2eadf] text-[#221b16]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-[#d8cabb] bg-[#fffaf0] p-5 shadow-[0_22px_80px_rgba(67,45,20,0.12)] md:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#7b5940]">
            <span className="rounded-full bg-[#ffe4e9] px-3 py-2 text-[#bb1d31]">Yes, these are real</span>
            <span className="rounded-full border border-[#d8cabb] px-3 py-2">Public records only</span>
            <span className="rounded-full border border-[#d8cabb] px-3 py-2">SAM.gov sourced</span>
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-[#8a6b51]">Uncle Sam&apos;s Cart · Today&apos;s receipt</p>
              <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.08em] text-[#1f1a16] sm:text-7xl lg:text-8xl">
                The government went shopping. It got weird.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#66574b]">
                Actual government contract notices, presented as a shopping receipt because democracy apparently needs fish food.
              </p>
            </div>
            <aside className="rounded-3xl border border-dashed border-[#b7a891] bg-white/70 p-5 font-mono text-sm text-[#4f4339]">
              <p className="font-bold uppercase tracking-[0.18em]">Scan summary</p>
              <p className="mt-4 text-3xl font-black text-[#1f1a16]">{payload.activeRows.toLocaleString()}</p>
              <p>active/public SAM.gov records scanned</p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#8a6b51]">Generated {formatDate(payload.generatedAt)}</p>
            </aside>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="grid gap-4">
            {items.map((item, index) => {
              return (
                <article key={item.id} className="rounded-[1.5rem] border border-[#d8cabb] bg-[#fffdf8] p-5 shadow-[0_8px_0_rgba(146,116,83,0.16)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-2xl font-black text-[#bb1d31]">#{index + 1}</span>
                        <span className="rounded-full bg-[#1f1a16] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white">Line item #{index + 1}</span>
                        <span className="rounded-full bg-[#efe2d2] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#5d4634]">{itemCategory(item)}</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-[#1f1a16]">{itemTitle(item)}</h2>
                      <p className="mt-2 text-sm font-bold text-[#6b5442]">{item.agency} · {item.office || "office unknown"}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-[#8a6b51]">Official title: {item.officialTitle ?? item.title}</p>
                      <p className="mt-3 max-w-3xl text-base leading-7 text-[#5d5349]">{shortReason(item)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.absurdityBadges.map((badge) => (
                          <span key={badge} className="rounded-full border border-[#d8cabb] px-3 py-1 text-xs font-bold text-[#6b5442]">{badge}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => sourceClicked(item)}
                        className="rounded-full border border-[#b7a891] px-4 py-3 text-center text-sm font-black text-[#1f1a16] hover:bg-[#fff3df]"
                      >
                        Source
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="sticky top-5 rounded-[1.5rem] border border-[#b7a891] bg-[#fffaf0] p-5 shadow-[0_18px_60px_rgba(67,45,20,0.14)]">
            <div className="border-b border-dashed border-[#b7a891] pb-4 font-mono">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6b51]">Today’s top 5</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">UNCLE SAM&apos;S CART</h2>
              <p className="mt-1 text-sm text-[#6b5442]">Actual public records. Extremely normal errands.</p>
            </div>
            <ol className="max-h-[46vh] space-y-3 overflow-auto border-b border-dashed border-[#b7a891] py-4 pr-1 font-mono text-sm">
              {receiptItems.map((item, index) => (
                <li key={item.id} className="grid grid-cols-[2ch_1fr] gap-3">
                  <span className="font-black">{index + 1}×</span>
                  <span>
                    <strong className="block leading-snug">{itemTitle(item)}</strong>
                    <span className="block text-xs text-[#6b5442]">{item.agency} · {itemCategory(item)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="border-b border-dashed border-[#b7a891] pb-4 font-mono text-xs leading-5 text-[#6b5442]">
              <p>SOURCE: SAM.gov Contract Opportunities bulk data</p>
              <p>Generated {formatDate(payload.generatedAt)} · prices hidden somewhere in the paperwork</p>
            </div>
            <div className="grid gap-2 py-4">
              <button type="button" onClick={shareReceipt} className="rounded-full bg-[#1f1a16] px-4 py-3 font-black text-white hover:bg-[#bb1d31]">
                Share receipt
              </button>
            </div>
            <div className="rounded-2xl bg-white/75 p-4 text-sm text-[#5d5349]">
              <p className="font-bold text-[#1f1a16]">{toast}</p>
              <p className="mt-3 text-xs leading-5">If the share sheet closes, nothing happened. Very advanced technology.</p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
