/**
 * Create (or reuse) a Stripe webhook for Iron Haven Pass.
 *
 * Usage:
 *   node scripts/create-stripe-webhook.mjs https://your-public-host/stripe-pass-webhook
 *   node scripts/create-stripe-webhook.mjs https://xxx.supabase.co/functions/v1/stripe-pass-webhook
 *
 * Reads STRIPE_SECRET_KEY from .env.server. Prints new signing secret once
 * (save it to .env.server as STRIPE_WEBHOOK_SECRET).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const targetUrl = process.argv[2];

if (!targetUrl || !/^https:\/\//i.test(targetUrl)) {
  console.error(
    'Usage: node scripts/create-stripe-webhook.mjs https://host/path/stripe-pass-webhook'
  );
  process.exit(1);
}

const serverEnv = fs.readFileSync(path.join(root, '.env.server'), 'utf8');
const sk = serverEnv.match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1];
if (!sk) {
  console.error('Missing STRIPE_SECRET_KEY in .env.server');
  process.exit(1);
}

const events = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

async function stripe(method, endpoint, fields) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${sk}` },
  };
  if (fields) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      if (Array.isArray(v)) v.forEach((item) => body.append(k, item));
      else body.set(k, String(v));
    }
    opts.body = body;
  }
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
  return data;
}

const list = await stripe('GET', 'webhook_endpoints?limit=100');
const existing = (list.data || []).find((w) => w.url === targetUrl);
if (existing) {
  console.log('Webhook already exists:', existing.id, existing.status, existing.url);
  console.log('Signing secret is only shown at creation — keep your existing whsec.');
  process.exit(0);
}

const body = {
  url: targetUrl,
  description: 'Iron Haven Pass',
  'metadata[ironhaven]': 'pass',
};
events.forEach((e, i) => {
  body[`enabled_events[${i}]`] = e;
});

const created = await stripe('POST', 'webhook_endpoints', body);
console.log('Created webhook', created.id);
console.log('URL', created.url);
console.log('Signing secret (save to .env.server STRIPE_WEBHOOK_SECRET):');
console.log(created.secret || '(not returned — check Dashboard)');
console.log('Events:', (created.enabled_events || []).join(', '));
