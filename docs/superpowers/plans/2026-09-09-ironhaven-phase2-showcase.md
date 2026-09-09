# IronHaven Phase 2 — Portfolio Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cold path (landing → intro/cinematic → menu → create/continue → Spawn Sanctum → controls → first objective) honest, fast, and recruiter-clear in ~60 seconds.

**Architecture:** Keep the existing `App.tsx` view state machine. Fix dishonest menu CTAs that all call the same enter path, align in-game help copy with Phase 1 bindings, and ensure the first open objective is impossible to miss after spawn. No remote fire poses (showcase does not show other shooters shooting).

**Tech Stack:** React 18, Vite, Vitest, existing onboarding/playerExperience helpers.

## Global Constraints

- Branch: `ereezyy/feat/ironhaven-completion-sprint`
- Spec: `docs/superpowers/specs/2026-09-09-ironhaven-completion-design.md` Phase 2
- Phase 1 already shipped: `1–4` weapons, `Shift+1–4` emotes, `G` gfx, `I` AI
- Out of scope: remote-player fire poses, new weapons, animation clips, combat rewrite, Phase 3 loop depth, Stripe/Pass hardening
- No secrets; no drive-by refactors outside listed files
- Prefer small focused commits per task when the task changes code

## File map

| File                                  | Responsibility                                              |
| ------------------------------------- | ----------------------------------------------------------- |
| `src/App.tsx`                         | View routing; simplify InstantAction props if CTAs collapse |
| `src/components/InstantAction.tsx`    | Post-cinematic menu — honest entry points                   |
| `src/components/MMOGame.tsx`          | Compact help chip + `!e.repeat` on AI key                   |
| `src/components/PlayerExperience.tsx` | ActiveObjectiveBar / strip already exist — verify only      |
| `src/game/onboarding.ts`              | CONTROLS_ROWS (already Phase 1) — add lock test             |
| `src/game/onboarding.test.ts`         | New — lock key-binding copy                                 |
| `src/lib/playerExperience.ts`         | `firstOpenObjective` already exists                         |
| `src/App.test.tsx`                    | Cold-path / landing smoke if present                        |

---

### Task 1: Honest InstantAction menu

**Files:**

- Modify: `src/components/InstantAction.tsx`
- Modify: `src/App.tsx` (props wired into InstantAction)
- Test: extend `src/App.test.tsx` if it covers menu; otherwise add a focused InstantAction render test only if cheap

**Problem:** Menu offers “Walk into a conversation”, “Join the live world”, and “Pick a fight” but `App.tsx` wires all three to `enterFromMenu` — same path. Recruiter sees three fake demos.

**Target UX:**

- Primary: **Enter District 01** → `enterFromMenu` (continue if save, else creator)
- Secondary: **New runner** → creator (keep)
- Keep **Continue as {callsign}** when present
- Remove the three fake-differentiated demo buttons OR relabel them into one primary so copy matches behavior

- [ ] **Step 1: Collapse InstantAction props**

Prefer a single `onEnterDistrict: () => void` plus optional `onNewRunner` / `onContinue`. Update the component interface and App wiring accordingly.

```tsx
interface InstantActionProps {
  onEnterDistrict: () => void;
  continueCallsign?: string | null;
  onContinue?: () => void;
  onNewRunner?: () => void;
}
```

- [ ] **Step 2: Replace the three demo rows with one primary CTA**

```tsx
{
  id: 'enter',
  label: 'Enter District 01',
  sub: 'Spawn Sanctum · same live sim',
  on: onEnterDistrict,
}
```

Keep New runner. Drop AI/MP/Combat fake splits.

- [ ] **Step 3: Soften body copy that overclaims**

Change the paragraph that says “Pick a path below — every demo loads the same authoritative simulation” to something honest, e.g. “One shared district. Enter to create or continue your runner.”

- [ ] **Step 4: Update `App.tsx`**

```tsx
<InstantAction
  onEnterDistrict={enterFromMenu}
  continueCallsign={...}
  onContinue={...}
  onNewRunner={enterCreator}
/>
```

Remove `onAIDemo` / `onMultiplayerDemo` / `onCombatDemo`.

- [ ] **Step 5: Run** `npm test -- src/App.test.tsx` (and any InstantAction test). Fix breakages from prop rename.

- [ ] **Step 6: Commit**

```bash
git add src/components/InstantAction.tsx src/App.tsx src/App.test.tsx
git commit -m "feat(menu): collapse fake demos into Enter District"
```

---

### Task 2: Align MMOGame compact help + AI key repeat

**Files:**

- Modify: `src/components/MMOGame.tsx`

**Problem:** Compact help chip (~line 2610) still shows `wasd · e · j · l · k · o` and omits Phase 1 `1–4` / `g` / `i`. AI panel toggle lacks `!e.repeat` while graphics has it.

- [ ] **Step 1: Update help chip text**

```tsx
<span style={{ color: COLORS.accent }}>wasd</span> move ·{' '}
<span style={{ color: COLORS.accent }}>e</span> talk ·{' '}
<span style={{ color: COLORS.accent }}>1–4</span> weapons ·{' '}
<span style={{ color: COLORS.accent }}>j</span> job ·{' '}
<span style={{ color: COLORS.accent }}>g</span> gfx ·{' '}
<span style={{ color: COLORS.accent }}>i</span> ai ·{' '}
<span style={{ color: COLORS.gold }}>o</span> pass
```

Keep the dismiss button.

- [ ] **Step 2: Guard AI panel with `!e.repeat`**

Where `e.code === AI_PANEL_KEY`, require `!e.repeat` (mirror GFX handler).

- [ ] \*\*Step 3: Grep MMOGame for other stale “1–4 emote” or “G opens AI” player-facing strings; fix only UI strings.

- [ ] **Step 4: Commit**

```bash
git add src/components/MMOGame.tsx
git commit -m "fix(hud): align help chip with weapon/gfx/ai bindings"
```

---

### Task 3: Lock onboarding key copy in tests

**Files:**

- Create: `src/game/onboarding.test.ts`
- Verify: `src/game/onboarding.ts` CONTROLS_ROWS (no change unless missing Phase 1 rows)

- [ ] **Step 1: Write failing/locking tests**

```ts
import { describe, it, expect } from 'vitest';
import { CONTROLS_ROWS } from './onboarding';

describe('CONTROLS_ROWS Phase 1 bindings', () => {
  it('documents weapon loadout on plain 1–4', () => {
    expect(CONTROLS_ROWS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: '1–4', action: 'Weapon loadout' }),
      ])
    );
  });

  it('documents emotes on Shift+1–4', () => {
    expect(CONTROLS_ROWS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: 'Shift+1–4', action: 'Emotes' }),
      ])
    );
  });

  it('splits graphics and AI keys', () => {
    expect(CONTROLS_ROWS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: 'G', action: 'Graphics quality' }),
        expect.objectContaining({ keys: 'I', action: 'AI director panel' }),
      ])
    );
  });
});
```

- [ ] **Step 2: Run** `npm test -- src/game/onboarding.test.ts` — expect PASS (rows already exist from Phase 1).

- [ ] **Step 3: Commit**

```bash
git add src/game/onboarding.test.ts
git commit -m "test(onboarding): lock weapon/emote/gfx/ai control rows"
```

---

### Task 4: First-objective clarity after spawn

**Files:**

- Inspect/modify as needed: `src/components/PlayerExperience.tsx` (`ActiveObjectiveBar`)
- Inspect: `src/components/MMOGame.tsx` (where ActiveObjectiveBar is mounted)
- Inspect: `src/game/objectives.ts`, `src/store/gameState.ts` for tutorial objective seeding
- Test: `src/lib/playerExperience.test.ts` / `src/game/objectives.test.ts`

**Goal:** Within the first seconds in-world, the player always sees one clear incomplete objective (tutorial step). No empty objective bar for new runners.

- [ ] **Step 1: Confirm tutorial objectives seed on new character**

Trace `initializePlayer` / applyCharacter / objectives init. If a new runner can spawn with zero objectives, seed the tutorial board from `objectives.ts` defaults.

- [ ] **Step 2: Confirm `ActiveObjectiveBar` renders whenever `firstOpenObjective(...)` is non-null**

If the bar is gated behind a flag that hides it during controls card, ensure it appears immediately after controls dismiss (or simultaneously as a slim top bar).

- [ ] **Step 3: Add/adjust a unit test** that a fresh objective list’s first incomplete item has a non-empty `label`.

- [ ] **Step 4: Commit only if code changed**

```bash
git commit -m "fix(px): ensure first tutorial objective is visible after spawn"
```

If already correct, report DONE with evidence (file:line) and no commit.

---

### Task 5: Phase 2 gate — tests + cold-path smoke

- [ ] **Step 1:** `npm test`
- [ ] **Step 2:** `npm run lint` and `npx tsc --noEmit`
- [ ] **Step 3:** Start `npm run dev`, hit http://127.0.0.1:5173/
  - Landing loads
  - Enter → intro/cinematic or skip-to-menu if seen
  - Menu shows Enter District 01 (not three fake demos)
  - New runner → creator → game OR Continue works
- [ ] **Step 4:** Note pointer-lock play as manual (Eddy) if headless stalls — do not block Phase 2 on WebGL district load in CI

---

## After Phase 2

Do not start Phase 3 until Tasks 1–2 are committed and Task 5 gates are green. Next plan: `docs/superpowers/plans/2026-09-09-ironhaven-phase3-demo-loop.md`.

## Spec coverage

| Spec item                                 | Task                                     |
| ----------------------------------------- | ---------------------------------------- |
| Tighten cold path CTAs / remove confusion | 1                                        |
| Controls / key copy consistency           | 2–3                                      |
| First clear objective                     | 4                                        |
| Verify                                    | 5                                        |
| Remote fire poses                         | Explicitly skipped (no shooter showcase) |
