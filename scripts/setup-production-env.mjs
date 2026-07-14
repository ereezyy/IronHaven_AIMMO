/**
 * One-shot local setup: wire gitignored .env from keys.txt + create Stripe Pass product/link.
 * Never prints full secrets. Run: node scripts/setup-production-env.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const keysPath = process.env.IRONHAVEN_KEYS || 'C:/Users/Eddy/Documents/keys.txt';

function parseEnvFile(raw) {
  /** Prefer unified-diff "+" side, then plain KEY=value, then "-" side. */
  const plus = {};
  const plain = {};
  const minus = {};
  for (const line of raw.split(/\r?\n/)) {
    let t = line.trim();
    if (!t || t.startsWith('#')) continue;

    // Git / patch style: "48 - KEY=val" or "50 + KEY=val" (optionally with leading spaces)
    const diff = t.match(/^\d+\s*([+-])\s+(.+)$/);
    if (diff) {
      t = diff[2].trim();
      const side = diff[1];
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
      if (side === '+') plus[k] = v;
      else minus[k] = v;
      continue;
    }

    // Also handle "      48 - KEY=val" without requiring leading digit-only start after trim
    const diff2 = t.match(/^(\d+)\s+([+-])\s+([A-Z][A-Z0-9_]*)=(.*)$/);
    if (diff2) {
      const side = diff2[2];
      const k = diff2[3];
      let v = (diff2[4] || '').trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (side === '+') plus[k] = v;
      else minus[k] = v;
      continue;
    }

    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
    plain[k] = v;
  }
  return { ...minus, ...plain, ...plus };
}

function upsert(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(content)) return content.replace(re, line);
  const base = content.endsWith('\n') || content === '' ? content : content + '\n';
  return base + line + '\n';
}

function redact(v) {
  if (!v) return null;
  return { len: v.length, prefix: v.slice(0, 10) + '…' };
}

async function stripeForm(sk, endpoint, fields) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sk}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Stripe ${endpoint}: ${msg}`);
  }
  return data;
}

async function stripeGet(sk, endpoint) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { Authorization: `Bearer ${sk}` },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Stripe GET ${endpoint}: ${msg}`);
  }
  return data;
}

const keysRaw = fs.readFileSync(keysPath, 'utf8');
const map = parseEnvFile(keysRaw);

const xai = map.XAI_API_KEY || map.VITE_XAI_API_KEY;
const pk = map.STRIPE_PUBLISHABLE_KEY || map.VITE_STRIPE_PUBLISHABLE_KEY;
const sk = map.STRIPE_LIVE_SECRET_KEY || map.STRIPE_SECRET_KEY;
const wh =
  map.STRIPE_WEBHOOK_SECRET_SNAPSHOT ||
  map.STRIPE_WEBHOOK_SECRET ||
  map.STRIPE_WEBHOOK_SECRET_THIN;

console.log(
  JSON.stringify(
    {
      XAI: redact(xai),
      STRIPE_PK: redact(pk),
      STRIPE_SK: redact(sk),
      STRIPE_WH: redact(wh),
    },
    null,
    2
  )
);

if (!sk) {
  console.error('No Stripe secret key in keys file — aborting product create.');
  process.exit(1);
}

// Existing .env (keep Supabase)
const envPath = path.join(root, '.env');
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (xai) env = upsert(env, 'VITE_XAI_API_KEY', xai);
if (pk) env = upsert(env, 'VITE_STRIPE_PUBLISHABLE_KEY', pk);

// Parse supabase url for pass API default
const envMap = parseEnvFile(env);
const supabaseUrl = (envMap.VITE_SUPABASE_URL || '').replace(/\/$/, '');
if (supabaseUrl) {
  env = upsert(
    env,
    'VITE_STRIPE_PASS_API',
    `${supabaseUrl}/functions/v1/stripe-pass-status`
  );
}

// Create product + weekly price + payment link
console.log('Creating Stripe product / price / payment link…');

// Search for existing product by metadata
let productId = null;
try {
  const search = await stripeGet(
    sk,
    'products/search?query=' +
      encodeURIComponent("metadata['ironhaven_product']:'iron_haven_pass' active:'true'")
  );
  if (search.data?.[0]?.id) {
    productId = search.data[0].id;
    console.log('Reusing product', productId);
  }
} catch (e) {
  console.warn('Product search skipped:', e.message);
}

if (!productId) {
  const product = await stripeForm(sk, 'products', {
    name: 'Iron Haven Pass',
    description:
      'Weekly Iron Haven Pass — +25% XP, shop discount, weekly skill points, VIP badge.',
    'metadata[ironhaven_product]': 'iron_haven_pass',
  });
  productId = product.id;
  console.log('Created product', productId);
}

// Find or create $1.99/week price
let priceId = null;
const prices = await stripeGet(
  sk,
  `prices?product=${productId}&active=true&limit=20`
);
const weekly = (prices.data || []).find(
  (p) =>
    p.unit_amount === 199 &&
    p.currency === 'usd' &&
    p.recurring?.interval === 'week'
);
if (weekly) {
  priceId = weekly.id;
  console.log('Reusing price', priceId);
} else {
  const price = await stripeForm(sk, 'prices', {
    product: productId,
    unit_amount: '199',
    currency: 'usd',
    'recurring[interval]': 'week',
    'recurring[interval_count]': '1',
    nickname: 'Iron Haven Pass weekly',
    'metadata[ironhaven_product]': 'iron_haven_pass',
  });
  priceId = price.id;
  console.log('Created price', priceId);
}

// Payment Link — success URL with ?pass=success
// Use localhost for dev; player can change after deploy
const successUrl =
  process.env.IRONHAVEN_SUCCESS_URL ||
  'http://localhost:5173/?pass=success';

let paymentLinkUrl = envMap.VITE_STRIPE_PAYMENT_LINK || '';
if (!paymentLinkUrl || !paymentLinkUrl.includes('buy.stripe.com')) {
  const link = await stripeForm(sk, 'payment_links', {
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'after_completion[type]': 'redirect',
    'after_completion[redirect][url]': successUrl,
    allow_promotion_codes: 'true',
    'metadata[ironhaven_product]': 'iron_haven_pass',
    'subscription_data[metadata][ironhaven_product]': 'iron_haven_pass',
  });
  paymentLinkUrl = link.url;
  console.log('Created payment link', link.id, '→', paymentLinkUrl);
} else {
  console.log('Keeping existing payment link in .env');
}

env = upsert(env, 'VITE_STRIPE_PAYMENT_LINK', paymentLinkUrl);
fs.writeFileSync(envPath, env.endsWith('\n') ? env : env + '\n');

// Server secrets (gitignored via .env.server — ensure gitignore)
const serverPath = path.join(root, '.env.server');
let server = '';
server += `STRIPE_SECRET_KEY=${sk}\n`;
if (wh) server += `STRIPE_WEBHOOK_SECRET=${wh}\n`;
if (map.STRIPE_WEBHOOK_SECRET_THIN) {
  server += `STRIPE_WEBHOOK_SECRET_THIN=${map.STRIPE_WEBHOOK_SECRET_THIN}\n`;
}
server += `STRIPE_PRICE_ID=${priceId}\n`;
server += `STRIPE_PRODUCT_ID=${productId}\n`;
if (supabaseUrl) server += `SUPABASE_URL=${supabaseUrl}\n`;
fs.writeFileSync(serverPath, server);

// Cache ids for docs (no secrets)
const metaPath = path.join(root, 'scripts', 'stripe-pass.meta.json');
fs.writeFileSync(
  metaPath,
  JSON.stringify(
    {
      productId,
      priceId,
      paymentLinkUrl,
      successUrl,
      passApi: supabaseUrl
        ? `${supabaseUrl}/functions/v1/stripe-pass-status`
        : null,
      createdAt: new Date().toISOString(),
    },
    null,
    2
  ) + '\n'
);

const envKeys = env
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split('=')[0]);
console.log('ENV_KEYS', envKeys.join(', '));
console.log('Done. Payment link and meta written; secrets only in gitignored files.');
