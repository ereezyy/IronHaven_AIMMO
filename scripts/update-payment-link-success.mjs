/**
 * Update Iron Haven Pass Payment Link success redirect.
 * Usage: node scripts/update-payment-link-success.mjs https://your-domain/?pass=success
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const successUrl =
  process.argv[2] || 'https://ironhaven-aimmo.vercel.app/?pass=success';

const server = fs.readFileSync(path.join(root, '.env.server'), 'utf8');
const sk = server.match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1];
if (!sk) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}

const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
const linkMatch = env.match(/^VITE_STRIPE_PAYMENT_LINK=(.+)$/m);
const paymentLinkUrl = linkMatch?.[1]?.trim();
if (!paymentLinkUrl) {
  console.error('No VITE_STRIPE_PAYMENT_LINK in .env');
  process.exit(1);
}

// List payment links and find matching URL
const listRes = await fetch(
  'https://api.stripe.com/v1/payment_links?limit=100&active=true',
  { headers: { Authorization: `Bearer ${sk}` } }
);
const list = await listRes.json();
if (list.error) {
  console.error(list.error.message);
  process.exit(1);
}

const link = (list.data || []).find((l) => l.url === paymentLinkUrl);
if (!link) {
  console.error('Payment link not found for', paymentLinkUrl);
  process.exit(1);
}

const body = new URLSearchParams();
body.set('after_completion[type]', 'redirect');
body.set('after_completion[redirect][url]', successUrl);

const upd = await fetch(`https://api.stripe.com/v1/payment_links/${link.id}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${sk}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body,
});
const data = await upd.json();
if (data.error) {
  console.error(data.error.message);
  process.exit(1);
}
console.log('Updated', data.id);
console.log('Success URL →', successUrl);
console.log('Payment Link →', data.url);
