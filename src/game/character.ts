// Playable character definition — creator output + in-game appearance.

export type ArchetypeId = 'runner' | 'enforcer' | 'ghost' | 'fixer';

export interface CharacterAppearance {
  tint: string;
  accent: string;
  bodyScale: number; // 0.9–1.1
}

export interface CharacterBuild {
  callsign: string;
  archetype: ArchetypeId;
  appearance: CharacterAppearance;
  /** Bonus points spent in creator (0–10 total). */
  bonuses: {
    combat: number;
    stealth: number;
    driving: number;
    intimidation: number;
  };
}

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  blurb: string;
  baseSkills: {
    combat: number;
    stealth: number;
    driving: number;
    intimidation: number;
  };
  startingMoney: number;
  startingKit: string[];
  defaultTint: string;
}

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'runner',
    name: 'Runner',
    blurb: 'Balanced street operator. Survives by adapting.',
    baseSkills: { combat: 12, stealth: 12, driving: 12, intimidation: 10 },
    startingMoney: 1000,
    startingKit: [],
    defaultTint: '#d4d5d8',
  },
  {
    id: 'enforcer',
    name: 'Enforcer',
    blurb: 'Front-line muscle. Hits hard, talks with fists.',
    baseSkills: { combat: 18, stealth: 8, driving: 10, intimidation: 14 },
    startingMoney: 800,
    startingKit: ['cyber_pistol'],
    defaultTint: '#c9a08a',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    blurb: 'Shadow work. Quiet scrapes, clean exits.',
    baseSkills: { combat: 10, stealth: 18, driving: 12, intimidation: 8 },
    startingMoney: 900,
    startingKit: [],
    defaultTint: '#9fb2c8',
  },
  {
    id: 'fixer',
    name: 'Fixer',
    blurb: 'Deals, crafts, and drives the economy.',
    baseSkills: { combat: 8, stealth: 10, driving: 14, intimidation: 16 },
    startingMoney: 1400,
    startingKit: [],
    defaultTint: '#c9b27a',
  },
];

export const TINT_PRESETS = [
  '#d4d5d8',
  '#c9a08a',
  '#9fb2c8',
  '#a8c99a',
  '#c9b27a',
  '#b89ac9',
  '#c99a9a',
  '#8a9aa8',
];

export const ACCENT_PRESETS = [
  '#c03a30',
  '#22d3ee',
  '#a855f7',
  '#39ff14',
  '#f5a524',
  '#e5e5e8',
];

export const BONUS_POOL = 8;

export function defaultBuild(callsign = 'Runner'): CharacterBuild {
  const a = ARCHETYPES[0];
  return {
    callsign,
    archetype: a.id,
    appearance: {
      tint: a.defaultTint,
      accent: '#c03a30',
      bodyScale: 1,
    },
    bonuses: { combat: 0, stealth: 0, driving: 0, intimidation: 0 },
  };
}

export function resolveSkills(build: CharacterBuild) {
  const arch = ARCHETYPES.find((a) => a.id === build.archetype) || ARCHETYPES[0];
  return {
    combat: arch.baseSkills.combat + build.bonuses.combat,
    stealth: arch.baseSkills.stealth + build.bonuses.stealth,
    driving: arch.baseSkills.driving + build.bonuses.driving,
    intimidation: arch.baseSkills.intimidation + build.bonuses.intimidation,
  };
}

export function bonusSpent(build: CharacterBuild): number {
  const b = build.bonuses;
  return b.combat + b.stealth + b.driving + b.intimidation;
}

export function loadBuild(): CharacterBuild | null {
  try {
    const raw = localStorage.getItem('ironhaven-character');
    if (!raw) return null;
    return JSON.parse(raw) as CharacterBuild;
  } catch {
    return null;
  }
}

export function saveBuild(build: CharacterBuild): void {
  try {
    localStorage.setItem('ironhaven-character', JSON.stringify(build));
    localStorage.setItem('ironhaven-username', build.callsign);
  } catch {
    /* ignore */
  }
}
