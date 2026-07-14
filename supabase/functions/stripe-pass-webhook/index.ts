/**
 * Supabase Edge Function — Stripe webhook for Iron Haven Pass ($1.99/wk).
 *
 * Deploy:
 *   supabase functions deploy stripe-pass-webhook --no-verify-jwt
 * Secrets (supabase secrets set …):
 *   STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY
 *   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected)
 *
 * Stripe Dashboard → Webhooks → endpoint:
 *   https://<project>.supabase.co/functions/v1/stripe-pass-webhook
 * Events: checkout.session.completed, customer.subscription.updated,
 *         customer.subscription.deleted, invoice.paid, invoice.payment_failed
 */

// @ts-expect-error Deno edge runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error Deno edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Stripe webhook signature verification (HMAC-SHA256). */
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.split('=');
      return [k.trim(), rest.join('=')];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSec) return false;

  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signed)
  );
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // constant-time compare
  if (expected.length !== v1.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return ok === 0;
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function upsertPass(row: {
  player_id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  expires_at: string;
  status: string;
}) {
  const sb = adminClient();
  const { error } = await sb.from('ironhaven_pass_subs').upsert(
    {
      player_id: row.player_id,
      stripe_customer_id: row.stripe_customer_id ?? null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      expires_at: row.expires_at,
      status: row.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' }
  );
  if (error) console.error('[stripe-pass-webhook] upsert', error.message);
  return !error;
}

function playerIdFromMeta(obj: Record<string, unknown> | null | undefined): string {
  if (!obj) return 'anonymous';
  const meta = (obj.metadata || {}) as Record<string, string>;
  return (
    meta.player_id ||
    meta.playerId ||
    meta.ironhaven_player ||
    (typeof obj.client_reference_id === 'string' ? obj.client_reference_id : null) ||
    'anonymous'
  );
}

function expiresFromPeriodEnd(unixSec?: number | null): string {
  if (unixSec && unixSec > 0) {
    return new Date(unixSec * 1000).toISOString();
  }
  return new Date(Date.now() + WEEK_MS).toISOString();
}

serve(async (req: Request) => {
  if (req.method === 'GET') {
    return json({ ok: true, service: 'stripe-pass-webhook' });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'missing webhook secret' }, 500);

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';
  if (!sig || !body) return json({ error: 'bad request' }, 400);

  const valid = await verifyStripeSignature(body, sig, secret);
  if (!valid) return json({ error: 'invalid signature' }, 400);

  let event: {
    type: string;
    data: { object: Record<string, unknown> };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const obj = event.data?.object || {};
  const type = event.type;

  try {
    if (
      type === 'checkout.session.completed' ||
      type === 'invoice.paid'
    ) {
      const playerId = playerIdFromMeta(obj);
      const customer =
        typeof obj.customer === 'string' ? obj.customer : null;
      const subscription =
        typeof obj.subscription === 'string' ? obj.subscription : null;
      // invoice: period end on lines; session: grant one week
      let expires = Date.now() + WEEK_MS;
      if (type === 'invoice.paid') {
        const lines = obj.lines as { data?: Array<{ period?: { end?: number } }> } | undefined;
        const end = lines?.data?.[0]?.period?.end;
        if (end) expires = end * 1000;
      }
      await upsertPass({
        player_id: playerId,
        stripe_customer_id: customer,
        stripe_subscription_id: subscription,
        expires_at: new Date(expires).toISOString(),
        status: 'active',
      });
    } else if (type === 'customer.subscription.updated') {
      const playerId = playerIdFromMeta(obj);
      const status = String(obj.status || 'active');
      const periodEnd = obj.current_period_end as number | undefined;
      const active =
        status === 'active' || status === 'trialing' || status === 'past_due';
      await upsertPass({
        player_id: playerId,
        stripe_customer_id:
          typeof obj.customer === 'string' ? obj.customer : null,
        stripe_subscription_id:
          typeof obj.id === 'string' ? obj.id : null,
        expires_at: active
          ? expiresFromPeriodEnd(periodEnd)
          : new Date().toISOString(),
        status,
      });
    } else if (
      type === 'customer.subscription.deleted' ||
      type === 'invoice.payment_failed'
    ) {
      const playerId = playerIdFromMeta(obj);
      await upsertPass({
        player_id: playerId,
        stripe_customer_id:
          typeof obj.customer === 'string' ? obj.customer : null,
        stripe_subscription_id:
          typeof obj.id === 'string'
            ? obj.id
            : typeof obj.subscription === 'string'
              ? obj.subscription
              : null,
        expires_at: new Date().toISOString(),
        status: type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
      });
    }
  } catch (e) {
    console.error('[stripe-pass-webhook] handler error', e);
    return json({ error: 'handler failed' }, 500);
  }

  return json({ received: true, type });
});
