import assert from 'node:assert/strict';
import worker from '../workers/share-events.js';

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.bound = [];
  }

  bind(...values) {
    this.bound = values;
    return this;
  }

  async run() {
    if (!/insert into events/i.test(this.sql)) {
      throw new Error(`Unexpected run SQL: ${this.sql}`);
    }
    const [event, app, createdAt, count, itemId, category, origin, referer, path, utmSource, utmMedium, utmCampaign] = this.bound;
    this.db.rows.push({ event, app, created_at: createdAt, count, item_id: itemId, category, origin, referer, path, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign });
    return { success: true };
  }

  async all() {
    if (/group by event/i.test(this.sql)) {
      const totals = new Map();
      for (const row of this.db.rows) totals.set(row.event, (totals.get(row.event) || 0) + 1);
      return { results: [...totals.entries()].map(([event, total]) => ({ event, total })).sort((a, b) => a.event.localeCompare(b.event)) };
    }
    if (/where event = 'sourceClick'/i.test(this.sql)) {
      const grouped = new Map();
      for (const row of this.db.rows.filter((row) => row.event === 'sourceClick')) {
        const key = `${row.item_id || ''}|${row.category || ''}`;
        const current = grouped.get(key) || { item_id: row.item_id, category: row.category, clicks: 0 };
        current.clicks += 1;
        grouped.set(key, current);
      }
      return { results: [...grouped.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 10) };
    }
    if (/date\(created_at\) as day/i.test(this.sql)) {
      return { results: this.db.rows.map((row) => ({ day: row.created_at.slice(0, 10), event: row.event, total: 1 })) };
    }
    return { results: this.db.rows.slice(-10).reverse().map(({ event, created_at, item_id, category, path, utm_source }) => ({ event, created_at, item_id, category, path, utm_source })) };
  }
}

class FakeDB {
  constructor() {
    this.rows = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

function makeEnv(extra = {}) {
  return { DB: new FakeDB(), ...extra };
}

async function request(env, path = '/', options = {}) {
  const response = await worker.fetch(new Request(`https://collector.test${path}`, options), env);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

const env = makeEnv({ SUMMARY_TOKEN: 'summary-secret' });

let result = await request(env, '/', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ app: 'uncle-sams-cart', event: 'pageView' }),
});
assert.equal(result.response.status, 403, 'POSTs without Origin must be rejected');

result = await request(env, '/', {
  method: 'POST',
  headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
  body: JSON.stringify({ app: 'uncle-sams-cart', event: 'pageView' }),
});
assert.equal(result.response.status, 403, 'POSTs from disallowed origins must be rejected');

result = await request(env, '/', {
  method: 'POST',
  headers: { origin: 'https://ethanhn.com', 'content-type': 'text/plain' },
  body: JSON.stringify({ app: 'uncle-sams-cart', event: 'pageView' }),
});
assert.equal(result.response.status, 415, 'non-JSON POSTs must be rejected');

result = await request(env, '/', {
  method: 'POST',
  headers: { origin: 'https://ethanhn.com', 'content-type': 'application/json' },
  body: JSON.stringify({ app: 'uncle-sams-cart', event: 'pageView', padding: 'x'.repeat(5000) }),
});
assert.equal(result.response.status, 413, 'oversized JSON must be rejected even without Content-Length');

result = await request(env, '/', {
  method: 'POST',
  headers: {
    origin: 'https://ethanhn.com',
    referer: 'https://ethanhn.com/uncle-sams-cart/?utm_source=groupchat&utm_medium=share&utm_campaign=weird_sam_receipt&secret=do-not-store#frag',
    'content-type': 'application/json',
  },
  body: JSON.stringify({ app: 'uncle-sams-cart', event: 'pageView', path: '/uncle-sams-cart/?utm_source=groupchat&utm_medium=share&utm_campaign=weird_sam_receipt&secret=do-not-store#frag' }),
});
assert.equal(result.response.status, 200, 'allowed pageView should be accepted');
assert.equal(env.DB.rows.length, 1);
assert.equal(env.DB.rows[0].event, 'pageView');
assert.equal(env.DB.rows[0].referer, 'https://ethanhn.com/uncle-sams-cart/');
assert.equal(env.DB.rows[0].path, '/uncle-sams-cart/');
assert.equal(env.DB.rows[0].utm_source, 'groupchat');
assert.equal(env.DB.rows[0].utm_medium, 'share');
assert.equal(env.DB.rows[0].utm_campaign, 'weird_sam_receipt');

result = await request(env, '/summary');
assert.equal(result.response.status, 401, '/summary should require auth when SUMMARY_TOKEN exists');

result = await request(env, '/summary', { headers: { authorization: 'Bearer summary-secret' } });
assert.equal(result.response.status, 200, '/summary should accept Bearer auth');
assert.equal(result.json.ok, true);
assert.ok(Array.isArray(result.json.daily), '/summary should include daily rollups');

console.log(JSON.stringify({ ok: true, rows: env.DB.rows }, null, 2));
