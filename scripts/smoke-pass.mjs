#!/usr/bin/env node
/**
 * Smoke Iron Haven Pass endpoints. Usage:
 *   node scripts/smoke-pass.mjs [baseUrl]
 * Default baseUrl: https://ironhaven-aimmo.vercel.app
 * Never prints env secrets — only HTTP status + JSON keys.
 */
const base = (process.argv[2] || 'https://ironhaven-aimmo.vercel.app').replace(
  /\/$/,
  ''
);

async function check(name, url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  const keys = json && typeof json === 'object' ? Object.keys(json) : [];
  console.log(`${name}: HTTP ${res.status} keys=[${keys.join(',')}]`);
  return {
    ok: res.status >= 200 && res.status < 500,
    status: res.status,
    json,
  };
}

const r1 = await check(
  'pass-status missing playerId',
  `${base}/api/stripe-pass-status`
);
const r2 = await check(
  'pass-status probe player',
  `${base}/api/stripe-pass-status?playerId=smoke-probe`
);
// Webhook without signature should not 500 the platform — expect 400/401/405
let r3;
try {
  r3 = await check(
    'pass-webhook bare POST',
    `${base}/api/stripe-pass-webhook`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }
  );
} catch (e) {
  console.log('pass-webhook bare POST: ERROR', e.message);
  r3 = { ok: false };
}

const landing = await fetch(base);
console.log(`landing: HTTP ${landing.status}`);

if (!r1.ok || !r2.ok || landing.status !== 200) {
  process.exit(1);
}
console.log('smoke-pass: OK');
