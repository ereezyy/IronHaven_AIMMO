# IronHaven Phase 1 — Play-Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land fire-aim pose + keyboard remapping so local fire raises the gun, `1–4` swap weapons, and `Shift+1–4` emotes without colliding with gfx/AI keys.

**Architecture:** Keep animation additive on the Mixamo soldier after mixer + hit flinch (`fireAim.ts`). Route keys through pure helpers in `inputBindings.ts`. Pulse fire via refs (`fireApi` → `fire` → `fireRef`) so the render loop does not re-render React on every shot.

**Tech Stack:** React 18, R3F/Three.js, Zustand, Vitest, Vite.

## Global Constraints

- Branch: `ereezyy/feat/ironhaven-completion-sprint` (do not commit Phase 1 to `main` directly)
- Spec: `docs/superpowers/specs/2026-09-09-ironhaven-completion-design.md`
- Out of scope: remote-player fire poses, new weapons, animation clips, full combat redesign
- No secrets in commits; no drive-by refactors outside listed files
- Prefer verifying/completing existing WIP over rewriting

## File map

| File                                  | Responsibility                                                        |
| ------------------------------------- | --------------------------------------------------------------------- |
| `src/game/fireAim.ts`                 | Aim bone list, `aimStrength`, `recoilKick`, decay constant            |
| `src/game/fireAim.test.ts`            | Unit tests for aim math and bone coverage                             |
| `src/game/inputBindings.ts`           | Weapon/emote digit helpers, `EMOTES`, `GFX_KEY`, `AI_PANEL_KEY`       |
| `src/game/inputBindings.test.ts`      | Unit tests for key routing                                            |
| `src/components/CharacterModel.tsx`   | Resolve aim bones; apply raise after flinch when `fireRef` > 0        |
| `src/components/MMOPlayer.tsx`        | Own `fire` ref; expose `fireApi.current = () => { fire.current = 1 }` |
| `src/components/MMOGame.tsx`          | Import bindings; call `playerFireApi` on attack; remap keys           |
| `src/components/PlayerExperience.tsx` | Persistent controls strip copy                                        |
| `src/game/onboarding.ts`              | `CONTROLS_ROWS` for controls card                                     |

---

### Task 1: `fireAim` module + tests

**Files:**

- Create/verify: `src/game/fireAim.ts`
- Create/verify: `src/game/fireAim.test.ts`
- Consumes: `BoneFlinch` type and `flinchStrength` from `src/game/hitReaction.ts`
- Produces: `FIRE_AIM`, `aimStrength(fire: number): number`, `recoilKick(fire: number): number`, `FIRE_AIM_DECAY_PER_SEC`

- [ ] **Step 1: Ensure tests exist and assert the contract**

`fireAim.test.ts` must cover:

```ts
import { describe, it, expect } from 'vitest';
import {
  FIRE_AIM,
  aimStrength,
  recoilKick,
  FIRE_AIM_DECAY_PER_SEC,
} from './fireAim';
import { flinchStrength } from './hitReaction';

describe('FIRE_AIM', () => {
  it('raises the right-arm chain that holds the weapon', () => {
    const bones = FIRE_AIM.map((b) => b.bone);
    expect(bones).toEqual(
      expect.arrayContaining([
        'mixamorig:RightShoulder',
        'mixamorig:RightArm',
        'mixamorig:RightForeArm',
        'mixamorig:RightHand',
      ])
    );
  });

  it('uses a real raise on RightArm, not a subtle flinch', () => {
    const arm = FIRE_AIM.find((b) => b.bone === 'mixamorig:RightArm');
    expect(arm).toBeTruthy();
    const mag = Math.hypot(...arm!.amplitude);
    expect(mag).toBeGreaterThan(0.8);
  });
});

describe('aimStrength vs flinch', () => {
  it('clamps', () => {
    expect(aimStrength(-1)).toBe(0);
    expect(aimStrength(2)).toBe(1);
  });

  it('holds the raise longer than a hit flinch at mid decay', () => {
    expect(aimStrength(0.5)).toBeGreaterThan(flinchStrength(0.5));
    expect(aimStrength(0.5)).toBeGreaterThan(0.65);
  });
});

describe('recoilKick', () => {
  it('is snappier than the hold (zero at rest, 1 at fire)', () => {
    expect(recoilKick(0)).toBe(0);
    expect(recoilKick(1)).toBe(1);
    expect(recoilKick(0.5)).toBeLessThan(aimStrength(0.5));
  });
});

describe('FIRE_AIM_DECAY_PER_SEC', () => {
  it('drops the pose in under a second, not instantly', () => {
    expect(FIRE_AIM_DECAY_PER_SEC).toBeGreaterThan(0.8);
    expect(FIRE_AIM_DECAY_PER_SEC).toBeLessThan(4);
  });
});
```

- [ ] **Step 2: Run focused tests**

```bash
npm test -- src/game/fireAim.test.ts
```

Expected: PASS (if WIP present). If FAIL because module missing, implement Step 3.

- [ ] **Step 3: Implementation (only if tests fail / files missing)**

```ts
import type { BoneFlinch } from './hitReaction';

export const FIRE_AIM: BoneFlinch[] = [
  { bone: 'mixamorig:Spine2', amplitude: [0.1, 0.04, 0] },
  { bone: 'mixamorig:RightShoulder', amplitude: [0.28, 0.08, 0.62] },
  { bone: 'mixamorig:RightArm', amplitude: [-1.22, 0.18, -0.52] },
  { bone: 'mixamorig:RightForeArm', amplitude: [-0.42, 0.05, 0.16] },
  { bone: 'mixamorig:RightHand', amplitude: [-0.28, 0.06, 0.38] },
];

export function aimStrength(fire: number): number {
  const f = Math.min(1, Math.max(0, fire));
  return Math.sqrt(f);
}

export function recoilKick(fire: number): number {
  const f = Math.min(1, Math.max(0, fire));
  return f * f;
}

export const FIRE_AIM_DECAY_PER_SEC = 1.55;
```

- [ ] **Step 4: Re-run focused tests — expect PASS**

---

### Task 2: `inputBindings` module + tests

**Files:**

- Create/verify: `src/game/inputBindings.ts`
- Create/verify: `src/game/inputBindings.test.ts`
- Produces: `isWeaponDigit`, `isEmoteDigit`, `weaponSlotFromDigit`, `EMOTES`, `GFX_KEY` (`KeyG`), `AI_PANEL_KEY` (`KeyI`)

- [ ] **Step 1: Ensure tests exist**

```ts
import { describe, it, expect } from 'vitest';
import {
  isWeaponDigit,
  isEmoteDigit,
  weaponSlotFromDigit,
  EMOTES,
  GFX_KEY,
  AI_PANEL_KEY,
} from './inputBindings';

function key(
  code: string,
  mods: Partial<{
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
  }> = {}
) {
  return {
    code,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    ...mods,
  };
}

describe('in-world digit bindings', () => {
  it('maps 1–4 to weapons, not emotes', () => {
    expect(isWeaponDigit(key('Digit1'))).toBe(true);
    expect(isEmoteDigit(key('Digit1'))).toBe(false);
    expect(weaponSlotFromDigit('Digit1')).toBe(0);
    expect(weaponSlotFromDigit('Digit4')).toBe(3);
  });

  it('Shift+1–4 is emotes only', () => {
    expect(isEmoteDigit(key('Digit2', { shiftKey: true }))).toBe(true);
    expect(isWeaponDigit(key('Digit2', { shiftKey: true }))).toBe(false);
    expect(EMOTES.Digit2).toMatch(/heat/i);
  });

  it('ignores Alt/Ctrl/Meta so browser chrome is not hijacked', () => {
    expect(isWeaponDigit(key('Digit1', { altKey: true }))).toBe(false);
    expect(isEmoteDigit(key('Digit1', { altKey: true, shiftKey: true }))).toBe(
      false
    );
  });

  it('keeps graphics and AI on different keys', () => {
    expect(GFX_KEY).toBe('KeyG');
    expect(AI_PANEL_KEY).toBe('KeyI');
    expect(GFX_KEY).not.toBe(AI_PANEL_KEY);
  });
});
```

- [ ] **Step 2: Run**

```bash
npm test -- src/game/inputBindings.test.ts
```

Expected: PASS.

- [ ] **Step 3: If missing, implement**

```ts
const DIGIT_1_4 = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4']);

export function isWeaponDigit(e: {
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return (
    DIGIT_1_4.has(e.code) &&
    !e.shiftKey &&
    !e.altKey &&
    !e.metaKey &&
    !e.ctrlKey
  );
}

export function isEmoteDigit(e: {
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return (
    DIGIT_1_4.has(e.code) && e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey
  );
}

export function weaponSlotFromDigit(code: string): number | null {
  if (!DIGIT_1_4.has(code)) return null;
  return parseInt(code.replace('Digit', ''), 10) - 1;
}

export const EMOTES: Record<string, string> = {
  Digit1: '👍 respect',
  Digit2: '🔥 heat',
  Digit3: '💀 threat',
  Digit4: '🤝 deal',
};

export const GFX_KEY = 'KeyG';
export const AI_PANEL_KEY = 'KeyI';
```

---

### Task 3: Wire `CharacterModel` fire pose

**Files:**

- Modify: `src/components/CharacterModel.tsx`
- Consumes: `FIRE_AIM`, `FIRE_AIM_DECAY_PER_SEC`, `aimStrength`, `recoilKick`
- Produces: optional prop `fireRef?: React.MutableRefObject<number>`

- [ ] **Step 1: Add prop + resolve aim bones** (same pattern as hit-flinch bones)

Accept `fireRef` next to `flashRef`. Build `aimBones` via `clone.getObjectByName` trying both colon-stripped and full Mixamo names.

- [ ] **Step 2: In the frame update, after flinch application**

```ts
if (fireRef && fireRef.current > 0) {
  fireRef.current = Math.max(
    0,
    fireRef.current - delta * FIRE_AIM_DECAY_PER_SEC
  );
}
const aim = deadRef?.current ? 0 : aimStrength(fireRef?.current ?? 0);
const kick = deadRef?.current ? 0 : recoilKick(fireRef?.current ?? 0);
if (aim > 0.001) {
  const k = aim + kick * 0.22;
  for (const { bone, amplitude } of aimBones) {
    bone.rotation.x += amplitude[0] * k;
    bone.rotation.y += amplitude[1] * k;
    bone.rotation.z += amplitude[2] * k;
  }
}
```

Apply **after** hit flinch so a simultaneous hit still reads as gun-up.

- [ ] **Step 3: Confirm TypeScript — no unused props / missing imports**

---

### Task 4: Wire `MMOPlayer` fire API

**Files:**

- Modify: `src/components/MMOPlayer.tsx`
- Consumes: `CharacterModel` `fireRef`
- Produces: `fireApi?: React.MutableRefObject<(() => void) | null>`

- [ ] **Step 1: Add `const fire = useRef(0)` and effect**

```ts
React.useEffect(() => {
  if (!fireApi) return;
  fireApi.current = () => {
    fire.current = 1;
  };
  return () => {
    fireApi.current = null;
  };
}, [fireApi]);
```

- [ ] **Step 2: Pass `fireRef={fire}` into `CharacterModel`**

- [ ] **Step 3: Mirror cleanup pattern used by `flashApi`**

---

### Task 5: Wire `MMOGame` keys + fire pulse

**Files:**

- Modify: `src/components/MMOGame.tsx`
- Consumes: all `inputBindings` exports; `playerFireApi` → `MMOPlayer.fireApi`

- [ ] **Step 1: Import bindings; add `playerFireApi` ref next to `playerFlashApi`**

- [ ] **Step 2: Graphics toggle uses `GFX_KEY` (not hard-coded only in one place)**

- [ ] **Step 3: Emotes — only `isEmoteDigit(e)` (Shift+1–4)**

Use `EMOTES[e.code]` and `useGameStore.getState().username` for the feed line.

- [ ] **Step 4: AI panel uses `AI_PANEL_KEY` (`KeyI`), not `KeyG`**

- [ ] **Step 5: Weapon swap — `isWeaponDigit(e)` + `weaponSlotFromDigit` (0-based index into loadout)**

- [ ] **Step 6: On successful attack roll, before `attackApi.current?.(dmg, weapon.range)`**

```ts
playerFireApi.current?.();
```

- [ ] **Step 7: Pass `fireApi={playerFireApi}` to `MMOPlayer`**

---

### Task 6: Onboarding + controls strip copy

**Files:**

- Modify: `src/game/onboarding.ts` (`CONTROLS_ROWS`)
- Modify: `src/components/PlayerExperience.tsx` (`PersistentControlsStrip`)

- [ ] **Step 1: Add rows**

```ts
{ keys: '1–4', action: 'Weapon loadout' },
{ keys: 'Shift+1–4', action: 'Emotes' },
{ keys: 'G', action: 'Graphics quality' },
{ keys: 'I', action: 'AI director panel' },
```

Keep existing rows; insert weapons/emotes near ability digits (`5–8`).

- [ ] **Step 2: Update persistent strip text to include `1–4` weapons, `g` gfx, `i` ai**

- [ ] **Step 3: Grep for stale copy claiming plain `1–4` are emotes or `G` opens AI**

```bash
npm test -- src/game/guidedTips.test.ts src/lib/playerExperience.test.ts
```

Fix any failing copy assertions if they hard-code old bindings.

---

### Task 7: Full test suite + lint gate

- [ ] **Step 1: Run full unit tests**

```bash
npm test
```

Expected: all suites PASS.

- [ ] **Step 2: Lint quiet**

```bash
npm run lint
```

Expected: exit 0.

- [ ] **Step 3: Typecheck if project uses it in CI**

```bash
npx tsc --noEmit
```

Expected: clean.

---

### Task 8: Browser smoke (Phase 1 gate)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open http://127.0.0.1:5173

- [ ] **Step 2: Enter game (skip/finish intro as needed), pointer-lock look**

- [ ] **Step 3: Fire (click/attack) — right arm / blaster raises off hip, then decays**

- [ ] **Step 4: Press `1`–`4` — weapon loadout changes; no emote bubble**

- [ ] **Step 5: `Shift+1`–`Shift+4` — emote bubble + kill-feed line**

- [ ] **Step 6: `G` toggles graphics; `I` toggles AI panel (not the same key)**

- [ ] **Step 7: Record pass/fail in the commit body if anything was tuned**

If browser tools unavailable, note that and rely on unit tests + manual checklist for Eddy.

---

### Task 9: Commit Phase 1

- [ ] **Step 1: Stage only Phase 1 files**

```bash
git add src/game/fireAim.ts src/game/fireAim.test.ts \
  src/game/inputBindings.ts src/game/inputBindings.test.ts \
  src/components/CharacterModel.tsx src/components/MMOPlayer.tsx \
  src/components/MMOGame.tsx src/components/PlayerExperience.tsx \
  src/game/onboarding.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(play): fire-aim pose and weapon/emote key split"
```

Body should mention: plain `1–4` weapons, `Shift+1–4` emotes, `G` gfx / `I` AI, local gun-up on fire.

- [ ] **Step 3: `git status` clean of Phase 1 paths; branch still `ereezyy/feat/ironhaven-completion-sprint`**

---

## After Phase 1

Do **not** start Phase 2 implementation until this plan’s Tasks 7–9 pass. Next plan file (separate): `docs/superpowers/plans/2026-09-09-ironhaven-phase2-showcase.md` — write only after Phase 1 gate.

## Spec coverage (self-review)

| Spec requirement                            | Task                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Land fireAim + inputBindings WIP            | 1–2                                                                        |
| Wire CharacterModel / MMOPlayer / MMOGame   | 3–5                                                                        |
| Controls strip + onboarding rows            | 6                                                                          |
| `npm test` + browser smoke + focused commit | 7–9                                                                        |
| Out of scope deferred                       | Documented; no tasks for remote aim / new weapons / clips / combat rewrite |
