// District factions — allegiance, standings, and territorial zones.

export type FactionId =
  | 'neon_syndicate'
  | 'chrome_guard'
  | 'dock_rats'
  | 'null';

export interface FactionDef {
  id: FactionId;
  name: string;
  blurb: string;
  color: string;
  enemies: FactionId[];
  allies: FactionId[];
  /** Starting standing when you join. */
  joinStanding: number;
}

export const FACTIONS: FactionDef[] = [
  {
    id: 'neon_syndicate',
    name: 'Neon Syndicate',
    blurb: 'Crime aristocracy. Style, stims, and street control.',
    color: '#c03a30',
    enemies: ['chrome_guard'],
    allies: ['dock_rats'],
    joinStanding: 25,
  },
  {
    id: 'chrome_guard',
    name: 'Chrome Guard',
    blurb: 'Corporate enforcers and bent badges. Order for a price.',
    color: '#3f7d9a',
    enemies: ['neon_syndicate', 'dock_rats'],
    allies: [],
    joinStanding: 20,
  },
  {
    id: 'dock_rats',
    name: 'Dock Rats',
    blurb: 'Smugglers, fishers, and scrap kings of the waterline.',
    color: '#39ff14',
    enemies: ['chrome_guard'],
    allies: ['neon_syndicate'],
    joinStanding: 30,
  },
  {
    id: 'null',
    name: 'Unaffiliated',
    blurb: "No colors. Free agent — everyone's problem, no one's friend.",
    color: '#8a8d92',
    enemies: [],
    allies: [],
    joinStanding: 0,
  },
];

export type FactionStanding = Record<FactionId, number>;

export function emptyStanding(): FactionStanding {
  return {
    neon_syndicate: 0,
    chrome_guard: 0,
    dock_rats: 0,
    null: 0,
  };
}

export function getFaction(id: FactionId): FactionDef {
  return FACTIONS.find((f) => f.id === id) || FACTIONS[3];
}

export function isHostileFaction(a: FactionId, b: FactionId): boolean {
  if (a === 'null' || b === 'null' || a === b) return false;
  const fa = getFaction(a);
  return fa.enemies.includes(b);
}

/** Circular territory markers for minimap / world rings. */
export interface FactionZone {
  id: string;
  factionId: FactionId;
  center: [number, number];
  radius: number;
  label: string;
}

export const FACTION_ZONES: FactionZone[] = [
  {
    id: 'z_syndicate',
    factionId: 'neon_syndicate',
    center: [40, -30],
    radius: 28,
    label: 'Syndicate Strip',
  },
  {
    id: 'z_guard',
    factionId: 'chrome_guard',
    center: [-35, 35],
    radius: 26,
    label: 'Guard Precinct',
  },
  {
    id: 'z_docks',
    factionId: 'dock_rats',
    center: [30, 40],
    radius: 30,
    label: 'Rat Docks',
  },
];

export function zoneAt(x: number, z: number): FactionZone | null {
  for (const z0 of FACTION_ZONES) {
    const dx = x - z0.center[0];
    const dz = z - z0.center[1];
    if (dx * dx + dz * dz <= z0.radius * z0.radius) return z0;
  }
  return null;
}
