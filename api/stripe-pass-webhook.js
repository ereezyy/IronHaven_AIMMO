/**
 * Vercel serverless — Stripe webhook for Iron Haven Pass.
 * POST /api/stripe-pass-webhook
 */
import crypto from 'node:crypto';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const globalStore =
  globalThis.__ihPassSubs || (globalThis.__ihPassSubs = new Map());

export const config = {
  api: { bodyParser: false },
};

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

async function upsertSupabase(row) {
  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) return;
  try {
    await fetch(`${sbUrl.replace(/\/$/, '')}/rest/v1/ironhaven_pass_subs`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
  } catch (e) {
    console.error('[webhook] supabase upsert', e.message);
  }
}

function upsertMemory(playerId, patch) {
  const prev = globalStore.get(playerId) || {};
  const next = {
    ...prev,
    ...patch,
    player_id: playerId,
    updated_at: new Date().toISOString(),
  };
  globalStore.set(playerId, next);
  return next;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, service: 'stripe-pass-webhook' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const body = await readRawBody(req);
  const sig = req.headers['stripe-signature'] || '';

  if (secret) {
    if (!verifyStripeSignature(body, String(sig), secret)) {
      res.status(400).json({ error: 'invalid signature' });
      return;
    }
  } else {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET unset');
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    res.status(400).json({ error: 'invalid json' });
    return;
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
    const row = {
      player_id: playerId,
      expires_at: new Date(expires).toISOString(),
      status: 'active',
      stripe_customer_id: typeof obj.customer === 'string' ? obj.customer : null,
      stripe_subscription_id:
        typeof obj.subscription === 'string' ? obj.subscription : null,
      updated_at: new Date().toISOString(),
    };
    upsertMemory(playerId, row);
    await upsertSupabase(row);
  } else if (type === 'customer.subscription.updated') {
    const status = String(obj.status || 'active');
    const active = ['active', 'trialing', 'past_due'].includes(status);
    const periodEnd = obj.current_period_end;
    const row = {
      player_id: playerId,
      status,
      expires_at: active
        ? new Date((periodEnd || Date.now() / 1000) * 1000).toISOString()
        : new Date().toISOString(),
      stripe_customer_id: typeof obj.customer === 'string' ? obj.customer : null,
      stripe_subscription_id: typeof obj.id === 'string' ? obj.id : null,
      updated_at: new Date().toISOString(),
    };
    upsertMemory(playerId, row);
    await upsertSupabase(row);
  } else if (
    type === 'customer.subscription.deleted' ||
    type === 'invoice.payment_failed'
  ) {
    const row = {
      player_id: playerId,
      status: type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
      expires_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertMemory(playerId, row);
    await upsertSupabase(row);
  }

  res.status(200).json({ received: true, type });
}
