const APP = "uncle-sams-cart";
const ALLOWED_EVENTS = new Set(["shareReceipt", "sourceClick"]);
const ALLOWED_ORIGINS = new Set([
  "https://ethanhn.com",
  "https://ethanhnguyen.github.io",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
]);

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, app: APP }, { headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/summary") {
      return summary(request, env, cors);
    }

    if (request.method !== "POST") {
      return jsonError("Method not allowed", 405, cors);
    }

    if (!isAllowedOrigin(origin)) {
      return jsonError("Forbidden origin", 403, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError("Bad JSON", 400, cors);
    }

    const app = cleanString(body.app, 64);
    const event = cleanString(body.event, 64);

    if (app !== APP) {
      return jsonError("Bad app", 400, cors);
    }

    if (!ALLOWED_EVENTS.has(event)) {
      return jsonError("Bad event", 400, cors);
    }

    const count = toBoundedInt(body.count, 0, 100);
    const itemId = cleanNullableString(body.id, 128);
    const category = cleanNullableString(body.category, 128);
    const path = cleanNullableString(request.headers.get("Referer"), 512);

    await env.DB.prepare(
      `insert into events (event, app, created_at, count, item_id, category, origin, referer)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(event, APP, new Date().toISOString(), count, itemId, category, origin || null, path)
      .run();

    return Response.json({ ok: true }, { headers: cors });
  },
};

export default worker;

async function summary(request, env, cors) {
  const url = new URL(request.url);
  const expected = env.SUMMARY_TOKEN;

  if (expected && url.searchParams.get("token") !== expected) {
    return jsonError("Unauthorized", 401, cors);
  }

  const totals = await env.DB.prepare(
    `select event, count(*) as total
     from events
     group by event
     order by event`
  ).all();

  const topSources = await env.DB.prepare(
    `select item_id, category, count(*) as clicks
     from events
     where event = 'sourceClick'
     group by item_id, category
     order by clicks desc
     limit 10`
  ).all();

  const recent = await env.DB.prepare(
    `select event, created_at, item_id, category
     from events
     order by id desc
     limit 10`
  ).all();

  return Response.json(
    {
      ok: true,
      totals: totals.results || [],
      topSources: topSources.results || [],
      recent: recent.results || [],
    },
    { headers: cors },
  );
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function isAllowedOrigin(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function jsonError(message, status, headers) {
  return Response.json({ ok: false, error: message }, { status, headers });
}

function cleanString(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function cleanNullableString(value, maxLen) {
  const cleaned = cleanString(value, maxLen);
  return cleaned || null;
}

function toBoundedInt(value, min, max) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}
