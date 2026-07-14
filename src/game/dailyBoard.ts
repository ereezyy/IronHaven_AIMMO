/**
 * Daily / weekly job board — sticky retention loop.
 * Deterministic by UTC day/week so all players share the same board.
 */

export type DailyKind =
  | 'hunt'
  | 'kills'
  | 'talk'
  | 'harvest'
  | 'earn'
  | 'fish'
  | 'faction';

export interface DailyJob {
  id: string;
  kind: DailyKind;
  title: string;
  blurb: string;
  target: number;
  rewardMoney: number;
  rewardXp: number;
  rewardSp: number;
  /** 0–1 progress filled by store. */
  progress: number;
  claimed: boolean;
}

export interface BoardState {
  dayKey: string;
  weekKey: string;
  dailies: DailyJob[];
  weekly: DailyJob;
}

const DAY_POOL: Omit<DailyJob, 'id' | 'progress' | 'claimed'>[] = [
  {
    kind: 'hunt',
    title: 'Thin the wildlife',
    blurb: 'Land hunt kills in the open world.',
    target: 5,
    rewardMoney: 350,
    rewardXp: 80,
    rewardSp: 0,
  },
  {
    kind: 'kills',
    title: 'Street work',
    blurb: 'Drop hostile runners / NPC targets.',
    target: 8,
    rewardMoney: 400,
    rewardXp: 100,
    rewardSp: 0,
  },
  {
    kind: 'talk',
    title: 'Network the block',
    blurb: 'Open dialogue with street NPCs.',
    target: 4,
    rewardMoney: 200,
    rewardXp: 50,
    rewardSp: 0,
  },
  {
    kind: 'harvest',
    title: 'Scavenge run',
    blurb: 'Harvest scrap nodes around the district.',
    target: 6,
    rewardMoney: 280,
    rewardXp: 60,
    rewardSp: 0,
  },
  {
    kind: 'earn',
    title: 'Stack paper',
    blurb: 'Net cash earned (any source).',
    target: 1500,
    rewardMoney: 500,
    rewardXp: 90,
    rewardSp: 0,
  },
  {
    kind: 'fish',
    title: 'Waterline haul',
    blurb: 'Land fish at dock spots.',
    target: 5,
    rewardMoney: 320,
    rewardXp: 70,
    rewardSp: 0,
  },
  {
    kind: 'faction',
    title: 'Wear the colors',
    blurb: 'Be in a faction and score standing (join counts as 1).',
    target: 1,
    rewardMoney: 250,
    rewardXp: 60,
    rewardSp: 1,
  },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function utcWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function pickDaily(dayKey: string, slot: number): DailyJob {
  const h = hash(`${dayKey}:${slot}`);
  const base = DAY_POOL[h % DAY_POOL.length];
  const scale = 1 + (h % 3) * 0.15;
  return {
    ...base,
    id: `daily_${dayKey}_${slot}`,
    target: Math.max(1, Math.round(base.target * scale)),
    rewardMoney: Math.round(base.rewardMoney * scale),
    rewardXp: Math.round(base.rewardXp * scale),
    progress: 0,
    claimed: false,
  };
}

function pickWeekly(weekKey: string): DailyJob {
  const h = hash(`weekly:${weekKey}`);
  return {
    id: `weekly_${weekKey}`,
    kind: 'kills',
    title: 'District dominance',
    blurb: 'Accumulate session kills this week (PvE + hunt + PvP).',
    target: 40 + (h % 20),
    rewardMoney: 2500,
    rewardXp: 500,
    rewardSp: 2,
    progress: 0,
    claimed: false,
  };
}

export function generateBoard(now = new Date()): BoardState {
  const dayKey = utcDayKey(now);
  const weekKey = utcWeekKey(now);
  return {
    dayKey,
    weekKey,
    dailies: [0, 1, 2].map((i) => pickDaily(dayKey, i)),
    weekly: pickWeekly(weekKey),
  };
}

export interface BoardCounters {
  huntKills: number;
  totalKills: number;
  talks: number;
  harvests: number;
  moneyEarned: number;
  fishCaught: number;
  factionJoined: number;
}

export function refreshProgress(
  board: BoardState,
  c: BoardCounters
): BoardState {
  const mapJob = (j: DailyJob): DailyJob => {
    let p = 0;
    switch (j.kind) {
      case 'hunt':
        p = c.huntKills;
        break;
      case 'kills':
        p = c.totalKills;
        break;
      case 'talk':
        p = c.talks;
        break;
      case 'harvest':
        p = c.harvests;
        break;
      case 'earn':
        p = c.moneyEarned;
        break;
      case 'fish':
        p = c.fishCaught;
        break;
      case 'faction':
        p = c.factionJoined;
        break;
    }
    return { ...j, progress: Math.min(j.target, p) };
  };
  return {
    ...board,
    dailies: board.dailies.map(mapJob),
    weekly: mapJob(board.weekly),
  };
}

export function isJobComplete(j: DailyJob): boolean {
  return j.progress >= j.target;
}

const STORAGE = 'ironhaven-daily-board';

export interface PersistedBoard {
  dayKey: string;
  weekKey: string;
  claimedIds: string[];
  /** Session-relative baselines so progress is "since reset". */
  baseline: BoardCounters;
}

export function loadPersistedBoard(): PersistedBoard | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedBoard;
  } catch {
    return null;
  }
}

export function savePersistedBoard(p: PersistedBoard): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function emptyCounters(): BoardCounters {
  return {
    huntKills: 0,
    totalKills: 0,
    talks: 0,
    harvests: 0,
    moneyEarned: 0,
    fishCaught: 0,
    factionJoined: 0,
  };
}
