# IronHaven Phase 4 — Ship + Monetize Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove Pass + Supabase + live deploy are honest and healthy; fix only concrete ship blockers found in smoke.

**Architecture:** Prefer read-only production smokes first (`curl` / `Invoke-WebRequest`). Add a small Node/PowerShell smoke script checked into `scripts/` that never prints secrets. Code fixes only when smoke shows a real bug (400 spam, wrong status JSON, CORS, missing route).

**Tech Stack:** Vercel serverless `api/*.js`, Supabase REST, Vite env `VITE_*`, Vitest where useful.

## Global Constraints

- Branch: `ereezyy/feat/ironhaven-completion-sprint`
- Spec Phase 4: Pass checkout/webhook/status smoke; Supabase presence without 400 spam; env/deploy parity; live URL matches git
- **Never invent revenue, subscriber counts, or banked cash**
- **Never commit secrets** (`.env`, service role keys, Stripe secrets)
- Out of scope: new gameplay, InstantAction decorative status-rail (honesty backlog — optional only if trivial)
- Prefer verify-then-fix over speculative rewrites

## File map

| File                         | Responsibility                    |
| ---------------------------- | --------------------------------- |
| `api/stripe-pass-status.js`  | GET/POST Pass restore             |
| `api/stripe-pass-webhook.js` | Stripe webhook + Supabase upsert  |
| `src/lib/stripePass.ts`      | Client Pass helpers               |
| `src/lib/supabase.ts`        | Client config / offline stub      |
| `src/lib/persistence.ts`     | Presence upsert (integer casting) |
| `scripts/smoke-pass.mjs`     | NEW — production/local Pass smoke |
| `docs/superpowers/plans/...` | This plan                         |
| `README.md` or `SHIP.md`     | Env checklist touch-up if needed  |

---

### Task 1: Pass status smoke script

**Files:**

- Create: `scripts/smoke-pass.mjs`
- Optional test: none (script is the verifier)

- [ ] **Step 1: Implement smoke script**

```js
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
```

- [ ] **Step 2: Run against production**

```bash
node scripts/smoke-pass.mjs https://ironhaven-aimmo.vercel.app
```

Expected: exit 0; status endpoints return JSON with `active` key; landing 200. Webhook bare POST may be 400 — OK as long as not opaque 500 crash without response.

- [ ] \*\*Step 3: If production URL 404s, try alternate from README/Vercel and update script default only after confirming.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-pass.mjs
git commit -m "chore(ship): add Pass endpoint smoke script"
```

---

### Task 2: Fix Pass/status issues found by smoke

**Files:** only if Task 1 fails for a concrete reason — `api/stripe-pass-status.js` and/or `api/stripe-pass-webhook.js` and/or `src/lib/stripePass.ts`

- [ ] **Step 1: Reproduce failure locally in report** (status code + body keys, no secrets)

- [ ] **Step 2: Minimal fix** (CORS, method, JSON shape `{ active, expiresAt }`, missing playerId handling already returns 200 — keep that)

- [ ] **Step 3: Re-run smoke script**

- [ ] **Step 4: Commit only if code changed**

```bash
git commit -m "fix(pass): harden status/webhook responses for smoke"
```

If Task 1 already green: **DONE with no commit**, cite smoke output in report.

---

### Task 3: Supabase presence 400 audit

**Files:**

- Inspect: `src/lib/persistence.ts` (integer casting for health/stamina/level)
- Inspect: `src/lib/supabase.ts`
- Test: existing tests if any; add a small pure unit test for row normalization if you extract a helper

- [ ] **Step 1: Confirm presence upsert casts floats to integers** before send (prior fix in history — verify still present)

- [ ] **Step 2: Confirm offline stub when `VITE_SUPABASE_*` missing** does not throw

- [ ] \*\*Step 3: If a remaining 400 path is obvious (e.g. avatar column), keep the existing PGRST204 retry; do not invent schema migrations in this task unless smoke proves breakage

- [ ] **Step 4: Commit only if code changed**

```bash
git commit -m "fix(mp): harden presence upsert against Postgres 400s"
```

---

### Task 4: Env / deploy parity checklist

**Files:**

- Modify: `SHIP.md` or `README.md` — short “Production env” section if missing
- Do **not** write real secret values

Checklist to document (names only):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / price id vars used by checkout
- `VITE_STRIPE_*` publishable if used client-side

- [ ] **Step 1: Grep codebase for `process.env.` and `import.meta.env.` used by Pass/Supabase**

- [ ] **Step 2: Add/update a bullet list of required names in SHIP.md**

- [ ] **Step 3: Commit**

```bash
git add SHIP.md README.md
git commit -m "docs(ship): list required Pass and Supabase env names"
```

---

### Task 5: Phase 4 gate + live URL note

- [ ] **Step 1:** `npm test` && `npm run lint`
- [ ] **Step 2:** `node scripts/smoke-pass.mjs https://ironhaven-aimmo.vercel.app`
- [ ] **Step 3:** Record in report: live URL HTTP 200, Pass status JSON shape, any SKIPPED items (cannot complete real Stripe checkout without keys in this agent session)
- [ ] **Step 4:** Note Eddy must still run one real Pass checkout in Stripe test mode if keys are available locally — agent must not claim paid revenue

---

## After Phase 4

Completion sprint merge decision via finishing-a-development-branch (recommended: push PR). Human manual playtest still covers Phase 1 pointer-lock + Phase 3 talk/fight/Pass banner.

## Spec coverage

| Spec                      | Task              |
| ------------------------- | ----------------- |
| Pass status/webhook smoke | 1–2               |
| Supabase presence health  | 3                 |
| Env/deploy parity         | 4                 |
| Live URL matches          | 5                 |
| No fake revenue           | Global constraint |
