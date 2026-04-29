const APP = "uncle-sams-cart";
const ALLOWED_EVENTS = new Set(["pageView", "shareReceipt", "sourceClick"]);
const MAX_BODY_BYTES = 4096;
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

    if (!isJsonRequest(request)) {
      return jsonError("Unsupported media type", 415, cors);
    }

    const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonError("Payload too large", 413, cors);
    }

    let body;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
        return jsonError("Payload too large", 413, cors);
      }
      body = JSON.parse(text);
    } catch {
      return jsonError("Invalid JSON", 400, cors);
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
    const referer = sanitizeAbsoluteUrl(request.headers.get("Referer"), origin);
    const path = sanitizePath(body.path || request.headers.get("Referer"));
    const utm = extractUtm(body.path || request.headers.get("Referer"));

    await env.DB.prepare(
      `insert into events (event, app, created_at, count, item_id, category, origin, referer, path, utm_source, utm_medium, utm_campaign)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(event, APP, new Date().toISOString(), count, itemId, category, origin, referer, path, utm.source, utm.medium, utm.campaign)
      .run();

    return Response.json({ ok: true }, { headers: cors });
  },
};

export default worker;

async function summary(request, env, cors) {
  const expected = env.SUMMARY_TOKEN;

  if (expected && bearerToken(request) !== expected) {
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
    `select event, created_at, item_id, category, path, utm_source
     from events
     order by id desc
     limit 10`
  ).all();

  const daily = await env.DB.prepare(
    `select date(created_at) as day, event, count(*) as total
     from events
     group by day, event
     order by day desc, event
     limit 30`
  ).all();

  return Response.json(
    {
      ok: true,
      totals: totals.results || [],
      topSources: topSources.results || [],
      recent: recent.results || [],
      daily: daily.results || [],
    },
    { headers: cors },
  );
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function isAllowedOrigin(origin) {
  return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}

function isJsonRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("application/json");
}

function bearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
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

function sanitizeAbsoluteUrl(value, allowedOrigin) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== allowedOrigin) return null;
    return `${url.origin}${url.pathname}`.slice(0, 512);
  } catch {
    return null;
  }
}

function sanitizePath(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(value, "https://ethanhn.com");
    return url.pathname.slice(0, 256);
  } catch {
    return null;
  }
}

function extractUtm(value) {
  const empty = { source: null, medium: null, campaign: null };
  if (typeof value !== "string" || !value) return empty;
  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(value, "https://ethanhn.com");
    return {
      source: cleanNullableString(url.searchParams.get("utm_source"), 80),
      medium: cleanNullableString(url.searchParams.get("utm_medium"), 80),
      campaign: cleanNullableString(url.searchParams.get("utm_campaign"), 120),
    };
  } catch {
    return empty;
  }
}
