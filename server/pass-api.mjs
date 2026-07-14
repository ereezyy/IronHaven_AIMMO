/**
 * Local Iron Haven Pass API — webhook + status restore.
 *
 * Use for playtest without Supabase edge deploy:
 *   node server/pass-api.mjs
 *   set VITE_STRIPE_PASS_API=http://localhost:8787/stripe-pass-status
 *
 * Production: prefer supabase/functions/* (see SHIP.md).
 *
 * Env (from .env.server or process):
 *   STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY (optional)
 *   PASS_API_PORT=8787
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, '.data');
const storePath = path.join(dataDir, 'pass-subs.json');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function loadDotEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  const map = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    map[t.slice(0, i)] = t.slice(i + 1);
  }
  return map;
}

const env = {
  ...loadDotEnv('.env.server'),
  ...loadDotEnv('.env'),
  ...process.env,
};

const PORT = Number(env.PASS_API_PORT || 8787);
const WH_SECRET = env.STRIPE_WEBHOOK_SECRET || '';

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify({ rows: {} }, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch {
    return { rows: {} };
  }
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

function upsertPass(playerId, patch) {
  const store = readStore();
  const prev = store.rows[playerId] || {};
  store.rows[playerId] = {
    ...prev,
    ...patch,
    player_id: playerId,
    updated_at: new Date().toISOString(),
  };
  writeStore(store);
  return store.rows[playerId];
}

function verifyStripeSignature(payload, header, secret) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.split('=');
      return [k.trim(), rest.join('=')];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 300) return false;
  const signed = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signed, 'utf8')
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(v1, 'utf8')
    );
  } catch {
    return false;
  }
}

function playerIdFromObj(obj) {
  const meta = (obj && obj.metadata) || {};
  return (
    meta.player_id ||
    meta.playerId ||
    meta.ironhaven_player ||
    obj.client_reference_id ||
    'anonymous'
  );
}

function json(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
    return json(res, 200, {
      ok: true,
      service: 'ironhaven-pass-api',
      webhookSecret: Boolean(WH_SECRET),
      store: storePath,
    });
  }

  // --- status restore ---
  if (
    (req.method === 'GET' || req.method === 'POST') &&
    (pathname === '/stripe-pass-status' ||
      pathname.endsWith('/stripe-pass-status'))
  ) {
    let playerId =
      url.searchParams.get('playerId') || url.searchParams.get('player_id');
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        playerId = body.playerId || body.player_id || playerId;
      } catch {
        /* ignore */
      }
    }
    if (!playerId) {
      return json(res, 200, {
        active: false,
        expiresAt: 0,
        hint: 'pass playerId',
      });
    }
    const row = readStore().rows[playerId];
    if (!row) return json(res, 200, { active: false, expiresAt: 0 });
    const expiresAt = new Date(row.expires_at).getTime();
    const active =
      (row.status === 'active' || row.status === 'trialing') &&
      expiresAt > Date.now();
    return json(res, 200, {
      active,
      expiresAt: active ? expiresAt : 0,
      status: row.status,
    });
  }

  // --- webhook ---
  if (
    req.method === 'POST' &&
    (pathname === '/stripe-pass-webhook' ||
      pathname.endsWith('/stripe-pass-webhook'))
  ) {
    const body = await readBody(req);
    const sig = req.headers['stripe-signature'] || '';

    if (WH_SECRET) {
      if (!verifyStripeSignature(body, String(sig), WH_SECRET)) {
        return json(res, 400, { error: 'invalid signature' });
      }
    } else {
      console.warn(
        '[pass-api] STRIPE_WEBHOOK_SECRET unset — accepting without verify (dev only)'
      );
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return json(res, 400, { error: 'invalid json' });
    }

    const type = event.type;
    const obj = (event.data && event.data.object) || {};
    const playerId = playerIdFromObj(obj);

    if (type === 'checkout.session.completed' || type === 'invoice.paid') {
      let expires = Date.now() + WEEK_MS;
      if (type === 'invoice.paid') {
        const end = obj.lines?.data?.[0]?.period?.end;
        if (end) expires = end * 1000;
      }
      upsertPass(playerId, {
        expires_at: new Date(expires).toISOString(),
        status: 'active',
        stripe_customer_id:
          typeof obj.customer === 'string' ? obj.customer : null,
        stripe_subscription_id:
          typeof obj.subscription === 'string' ? obj.subscription : null,
      });
      console.log('[pass-api] activated', playerId, type);
    } else if (type === 'customer.subscription.updated') {
      const status = String(obj.status || 'active');
      const active = ['active', 'trialing', 'past_due'].includes(status);
      const periodEnd = obj.current_period_end;
      upsertPass(playerId, {
        status,
        expires_at: active
          ? new Date((periodEnd || Date.now() / 1000) * 1000).toISOString()
          : new Date().toISOString(),
        stripe_customer_id:
          typeof obj.customer === 'string' ? obj.customer : null,
        stripe_subscription_id: typeof obj.id === 'string' ? obj.id : null,
      });
    } else if (
      type === 'customer.subscription.deleted' ||
      type === 'invoice.payment_failed'
    ) {
      upsertPass(playerId, {
        status:
          type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
        expires_at: new Date().toISOString(),
      });
    }

    return json(res, 200, { received: true, type });
  }

  // Dev helper: grant a week without Stripe (local only)
  if (req.method === 'POST' && pathname === '/dev/grant-pass') {
    if (process.env.NODE_ENV === 'production') {
      return json(res, 403, { error: 'disabled' });
    }
    let playerId = 'anonymous';
    try {
      const body = JSON.parse(await readBody(req));
      playerId = body.playerId || playerId;
    } catch {
      /* ignore */
    }
    const row = upsertPass(playerId, {
      expires_at: new Date(Date.now() + WEEK_MS).toISOString(),
      status: 'active',
      source: 'dev_grant',
    });
    return json(res, 200, {
      active: true,
      expiresAt: new Date(row.expires_at).getTime(),
    });
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[pass-api] http://127.0.0.1:${PORT}`);
  console.log(`[pass-api] status  GET  /stripe-pass-status?playerId=…`);
  console.log(`[pass-api] webhook POST /stripe-pass-webhook`);
  console.log(`[pass-api] webhook secret: ${WH_SECRET ? 'set' : 'MISSING'}`);
});
