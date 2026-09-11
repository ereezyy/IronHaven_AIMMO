# IronHaven AIMMO — Completion Sprint Design

**Date:** 2026-09-09  
**Status:** Approved for planning  
**Repo:** `C:\users\eddy\projects\IronHaven_AIMMO`  
**Live:** https://ironhaven-aimmo.vercel.app

## Context

IronHaven is a shipped v1.0.0 browser AIMMO (Vite/React/Three.js, Supabase realtime, Stripe Pass). Shipping audit marked build/tests/lint green. Uncommitted WIP already implements fire-aim pose and input remapping.

This sprint finishes the product as a **credible portfolio AIMMO** via sequential gated phases (Approach A). Phase 3 is scoped like a vertical slice: deepen only the demo loop.

## Goal & success bar

A cold visitor experiences an intentional first minute; one short loop is deep enough to demo; Pass and multiplayer stay honest and working; live URL matches git.

**Done when:**

1. Phase 1 play-feel is committed and verified
2. Landing → create → spawn → shoot/talk → first job works without confusion
3. Stripe Pass + Supabase do not lie or spam errors
4. Production deploy matches `main`

## Approach

**Sequential gated phases.** Strict order: 1 → 2 → 3 → 4. Each phase has a verification gate before the next starts. No skipping to content while gun-up/keys are unfinished.

## Phase 1 — Play-feel (start here)

### In scope

Land and verify existing WIP:

| Piece                                      | Role                                               |
| ------------------------------------------ | -------------------------------------------------- |
| `src/game/fireAim.ts`                      | Additive Mixamo right-arm raise + recoil kick      |
| `src/game/inputBindings.ts`                | `1–4` weapons; `Shift+1–4` emotes; `G` gfx; `I` AI |
| `CharacterModel` / `MMOPlayer` / `MMOGame` | Wire `fireRef` / `fireApi`; remap keys             |
| `PlayerExperience` + `onboarding`          | Control strip and controls card copy               |
| Unit tests                                 | `fireAim.test.ts`, `inputBindings.test.ts`         |

### Finish gate

1. `npm test` passes (including new modules)
2. Browser smoke: click-look → fire raises gun → `1–4` swaps weapons → `Shift+1–4` emotes → `G`/`I` do not collide
3. One focused play-feel commit (no drive-by refactors)

### Explicitly out of Phase 1

| Item                                   | Deferred to                                                     |
| -------------------------------------- | --------------------------------------------------------------- |
| Remote-player fire poses               | Phase 2 or early Phase 3, only if showcase shows other shooters |
| New weapons                            | Phase 3, only if demo loop needs a loadout beat                 |
| Real animation clips vs procedural aim | Phase 3 only if playtest says procedural aim still fails        |
| Full combat redesign                   | **Not in this sprint**                                          |

## Phase 2 — Portfolio showcase (first ~60s)

Tighten cold path: landing → intro/cinematic → character create → Spawn Sanctum → controls card → first clear objective. Remove dead ends and confusing key copy. Optional remote fire pose only if another runner is shown shooting.

## Phase 3 — One coherent short loop

Deepen only what the demo uses: one district job chain (talk → fight/harvest → reward → Pass CTA). Economy/AI/quests get polish on that path only. New weapons or clip upgrades only if the loop needs them.

## Phase 4 — Ship + monetize hardening

Smoke Pass checkout / webhook / status; Supabase presence without 400 spam; env/deploy parity; live URL matches `main`. No invented revenue claims.

## Architecture & seams

```
Input (MMOGame keydown)
  └─ inputBindings.ts  →  weapon slot | emote | gfx | AI panel

Attack (MMOGame fire)
  └─ playerFireApi → MMOPlayer.fire ref → CharacterModel fireAim bones

Hit feedback (existing)
  └─ flashRef / hitReaction  (unchanged; aim applies after flinch)

Onboarding / HUD copy
  └─ onboarding CONTROLS_ROWS + PersistentControlsStrip
```

Later phases reuse the same seams:

- **Phase 2:** landing / intro / onboarding flags / first objective bar
- **Phase 3:** missions / objectives / economy / Pass panel on the demo path
- **Phase 4:** `api/stripe-*`, `lib/supabase`, `lib/multiplayer`, Vercel env

### Error handling (Phase 1)

No new network paths. Fire pose is local refs only. If `fireRef` is missing, the model behaves as before (gun at rest).

### Testing

- Phase 1: unit tests for `fireAim` + `inputBindings`; full `npm test`; browser smoke of fire + keys
- Phase 4: production smoke (`/api/stripe-pass-status`, webhook health)

## Non-goals (this sprint)

- Native installers, mobile app, voice chat, VR
- Bundled AI models (BYO key remains)
- Expanding every MMO system beyond the demo loop
- Fake metrics or fabricated Pass/revenue numbers

## Implementation next step

Write a phased implementation plan (`docs/superpowers/plans/…`) starting with Phase 1 tasks, then execute Phase 1 through its gate before planning detail for Phase 2+.
