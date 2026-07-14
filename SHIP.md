# Iron Haven — ship checklist

## Live production

| Piece                | URL / status                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Game**             | https://ironhaven-aimmo.vercel.app                                                                 |
| Pass Payment Link    | https://buy.stripe.com/3cI00i7VC9O70QFg6Paoc0X ($1.99/wk live)                                     |
| Success redirect     | `https://ironhaven-aimmo.vercel.app/?pass=success`                                                 |
| Pass status API      | `GET /api/stripe-pass-status?playerId=…`                                                           |
| Stripe webhook       | `POST /api/stripe-pass-webhook` (registered live)                                                  |
| Local play           | http://127.0.0.1:5173 + `npm run pass-api`                                                         |
| Supabase multiplayer | **ACTIVE_HEALTHY** (`gqhiranldvmzuasdfjqz`) restored 2026-07-14; schema + RLS applied, realtime on |

## Smoke verified

- `/` → 200 HTML
- `/api/stripe-pass-webhook` GET → `{ ok: true }`
- `/api/stripe-pass-status?playerId=test` → `{ active: false, expiresAt: 0 }`

## Commands

```bash
# Local
npm run pass-api          # http://127.0.0.1:8787
npm run dev               # http://127.0.0.1:5173
npm run setup:prod        # refresh .env from keys.txt + Stripe product

# Ship
npm run deploy            # vercel production
npm run webhook:create -- https://ironhaven-aimmo.vercel.app/api/stripe-pass-webhook
npm run payment-link:success -- https://ironhaven-aimmo.vercel.app/?pass=success
```

## Env (never commit)

| File               | Contents                                     |
| ------------------ | -------------------------------------------- |
| `.env`             | `VITE_*` client vars                         |
| `.env.server`      | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Vercel project env | same + serverless secrets                    |

## Playtest production Pass

1. Open https://ironhaven-aimmo.vercel.app
2. Enter game → Pass panel → checkout (live card charges)
3. Stripe returns to `/?pass=success` → local Pass week activated
4. Webhook hits Vercel `/api/stripe-pass-webhook` for server truth

## When Supabase is restored

1. Unpause project / fix DNS
2. `npx supabase login` → link → `db push` → deploy edge functions (optional if Vercel API is enough)
3. Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel for durable pass rows across isolates

## Security

- `.env*`, `.env.server`, `.data/`, `.vercel` gitignored
- Live Stripe = real money
- Do not put `sk_live` / `whsec` in `VITE_*`
