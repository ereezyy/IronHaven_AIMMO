# IronHaven Phase 3 — Demo Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the short street loop (talk → fight → arm → cash feedback → Pass CTA) feel complete and demoable without expanding the whole MMO.

**Architecture:** Keep `buildStreetObjectives` as the source of truth. Add pure helpers for “what just completed” and “when to soft-nudge Pass”. Wire MMOGame’s existing reward effect to kill-feed/toasts and a one-shot Pass invite after the early tutorial beats. No new weapon catalog, no combat rewrite, no remote fire poses.

**Tech Stack:** React, Zustand game store, Vitest, existing PassPanel / ActiveObjectiveBar / kill feed.

## Global Constraints

- Branch: `ereezyy/feat/ironhaven-completion-sprint`
- Spec Phase 3: one district job chain talk → fight/harvest → reward → Pass CTA
- Do not invent revenue; Pass CTA must not claim fake subscriber counts
- Out of scope: new weapons list, animation clips, remote fire, Stripe/env (Phase 4), InstantAction status-rail honesty backlog
- No secrets; stay on listed files
- Prefer small commits per task

## File map

| File                                  | Responsibility                                      |
| ------------------------------------- | --------------------------------------------------- |
| `src/game/objectives.ts`              | Street objectives + new pure helpers                |
| `src/game/objectives.test.ts`         | Tests for helpers + labels                          |
| `src/game/demoLoop.ts`                | NEW — Pass nudge / reward announcement helpers      |
| `src/game/demoLoop.test.ts`           | NEW — unit tests                                    |
| `src/components/MMOGame.tsx`          | Wire rewards → feed + Pass nudge                    |
| `src/components/PlayerExperience.tsx` | Optional slim Pass nudge banner component           |
| `src/game/guidedTips.ts`              | Align first tips with talk/fight/arm/pass if needed |

---

### Task 1: Pure demo-loop helpers

**Files:**

- Create: `src/game/demoLoop.ts`
- Create: `src/game/demoLoop.test.ts`
- May import types from `src/game/objectives.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
  newlyCompletedObjectives,
  shouldNudgePass,
  formatContractPayout,
} from './demoLoop';
import type { StreetObjective } from './objectives';

const base = (
  partial: Partial<StreetObjective> & { id: string; label: string }
): StreetObjective => ({
  done: false,
  reward: 50,
  ...partial,
});

describe('newlyCompletedObjectives', () => {
  it('returns objectives that are done but not yet in the rewarded set', () => {
    const street = [
      base({ id: 'talk', label: 'Talk', done: true, reward: 50 }),
      base({ id: 'kill', label: 'Kill', done: false, reward: 100 }),
    ];
    const rewarded = new Set<string>();
    const hit = newlyCompletedObjectives(street, rewarded);
    expect(hit.map((o) => o.id)).toEqual(['talk']);
  });

  it('skips already rewarded ids', () => {
    const street = [
      base({ id: 'talk', label: 'Talk', done: true, reward: 50 }),
    ];
    const rewarded = new Set(['talk']);
    expect(newlyCompletedObjectives(street, rewarded)).toEqual([]);
  });
});

describe('shouldNudgePass', () => {
  it('nudges once after talk+kill are done when pass inactive and not yet nudged', () => {
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: true,
        passActive: false,
        alreadyNudged: false,
      })
    ).toBe(true);
  });

  it('does not nudge if pass already active or already nudged or early beats incomplete', () => {
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: true,
        passActive: true,
        alreadyNudged: false,
      })
    ).toBe(false);
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: false,
        passActive: false,
        alreadyNudged: false,
      })
    ).toBe(false);
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: true,
        passActive: false,
        alreadyNudged: true,
      })
    ).toBe(false);
  });
});

describe('formatContractPayout', () => {
  it('formats a readable kill-feed line', () => {
    expect(
      formatContractPayout('Talk to someone on the street (E)', 50)
    ).toMatch(/contract/i);
    expect(
      formatContractPayout('Talk to someone on the street (E)', 50)
    ).toMatch(/\$50/);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/game/demoLoop.test.ts
```

- [ ] **Step 3: Implement**

```ts
import type { StreetObjective } from './objectives';

export function newlyCompletedObjectives(
  street: StreetObjective[],
  rewarded: Set<string>
): StreetObjective[] {
  return street.filter((o) => o.done && o.reward > 0 && !rewarded.has(o.id));
}

export function shouldNudgePass(args: {
  talkedDone: boolean;
  killDone: boolean;
  passActive: boolean;
  alreadyNudged: boolean;
}): boolean {
  return (
    args.talkedDone && args.killDone && !args.passActive && !args.alreadyNudged
  );
}

export function formatContractPayout(label: string, reward: number): string {
  const short = label.replace(/\s*\(.*\)\s*$/, '').trim();
  return `Contract cleared — ${short} · +$${reward}`;
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/demoLoop.ts src/game/demoLoop.test.ts
git commit -m "feat(loop): add demo-loop payout and pass-nudge helpers"
```

---

### Task 2: Wire payout feedback in MMOGame

**Files:**

- Modify: `src/components/MMOGame.tsx`
- Consumes: `newlyCompletedObjectives`, `formatContractPayout` from `demoLoop.ts`

**Current:** reward effect adds money silently when objectives complete.

- [ ] **Step 1: Refactor the street-reward `useEffect` (~1301) to use `newlyCompletedObjectives`**

For each newly completed objective:

1. Mark id in `rewardedObjectives.current`
2. Sum rewards / update money (same as today)
3. `pushFeed(formatContractPayout(o.label, o.reward), 'info')` (or existing feed helper)
4. Play a light success SFX if one exists (`gameAudio.play('market' | 'ui', …)`)

- [ ] **Step 2: Keep dependency array behavior equivalent** — do not pay twice.

- [ ] **Step 3: Manual reasoning check** — talking once then killing once yields two feed lines and correct cash.

- [ ] **Step 4: Commit**

```bash
git add src/components/MMOGame.tsx
git commit -m "feat(loop): announce street contract payouts in kill feed"
```

---

### Task 3: Soft Pass CTA after talk+kill

**Files:**

- Modify: `src/components/MMOGame.tsx`
- Optionally create small banner in `src/components/PlayerExperience.tsx` and export it
- Consumes: `shouldNudgePass`, `isPassActive` / `passIsLive`

- [ ] **Step 1: Add a ref `passNudgedRef = useRef(false)`**

- [ ] **Step 2: After street objectives update (same effect or sibling), if `shouldNudgePass({ talkedDone, killDone, passActive, alreadyNudged: passNudgedRef.current })`:**
  - set `passNudgedRef.current = true`
  - set a React state `passNudgeOpen` true OR open Pass panel once with a softer banner first

**Recommended UX (less aggressive):** show a dismissible banner:

```
Street heat pays. Iron Haven Pass — +25% XP · shop cut · O
[Open Pass] [Not now]
```

No fake “N runners subscribed”. Use existing `PASS_PRODUCT` copy if helpful.

- [ ] **Step 3: Persist nudge-seen in session only (ref is enough)** — do not localStorage-spam return visitors every load unless you also gate with a day key; session ref is fine for demo.

- [ ] \*\*Step 4: Unit-test `shouldNudgePass` already covers logic; optional React test only if cheap.

- [ ] **Step 5: Commit**

```bash
git add src/components/MMOGame.tsx src/components/PlayerExperience.tsx
git commit -m "feat(loop): soft Pass CTA after early street contracts"
```

---

### Task 4: Tip / objective copy polish for the arm beat

**Files:**

- Modify: `src/game/guidedTips.ts` and/or labels in `objectives.ts` only if needed
- Test: `src/game/guidedTips.test.ts`, `src/game/objectives.test.ts`

- [ ] **Step 1: Ensure an early guided tip mentions E talk, click fight, B market, O pass** without contradicting Phase 1 keys.

- [ ] **Step 2: Keep objective labels actionable** (`Talk… (E)`, `Buy a weapon… (B)` already good).

- [ ] **Step 3: Commit only if changed**

```bash
git commit -m "fix(loop): align guided tips with talk/fight/arm/pass demo path"
```

---

### Task 5: Phase 3 gate

- [ ] **Step 1:** `npm test`
- [ ] **Step 2:** `npm run lint` && `npx tsc --noEmit`
- [ ] **Step 3:** Document manual demo script for Eddy:
  1. Enter District → create runner
  2. Dismiss controls
  3. E talk → see payout feed
  4. Fight one NPC → see payout feed
  5. See Pass soft CTA → Open Pass shows real $1.99 offer (no fake metrics)
  6. Optional B buy weapon for arm objective

---

## After Phase 3

Next: `docs/superpowers/plans/2026-09-09-ironhaven-phase4-ship-harden.md` (Stripe/Supabase/deploy smoke).

## Spec coverage

| Spec                              | Task                    |
| --------------------------------- | ----------------------- |
| talk → fight → reward             | 1–2                     |
| Pass CTA on demo path             | 3                       |
| Deepen only demo path copy/tips   | 4                       |
| Verify                            | 5                       |
| New weapons / clips / remote fire | Explicitly out of scope |
