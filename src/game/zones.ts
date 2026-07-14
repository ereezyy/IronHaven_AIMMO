// Open-world zone rules: safe / PvE / PvP / boss.

export type ZoneKind = 'safe' | 'pve' | 'pvp' | 'boss';

export interface WorldZone {
  id: string;
  kind: ZoneKind;
  center: [number, number];
  radius: number;
  label: string;
  color: string;
}

export const WORLD_ZONES: WorldZone[] = [
  {
    id: 'safe_spawn',
    kind: 'safe',
    center: [0, 0],
    radius: 14,
    label: 'Spawn Sanctum',
    color: '#3f7d4e',
  },
  {
    id: 'pve_north',
    kind: 'pve',
    center: [0, -50],
    radius: 32,
    label: 'Dead Circuit',
    color: '#c9a15a',
  },
  {
    id: 'pvp_arena',
    kind: 'pvp',
    center: [-45, -20],
    radius: 30,
    label: 'Blood Grid',
    color: '#c03a30',
  },
  {
    id: 'pvp_rooftops',
    kind: 'pvp',
    center: [50, 15],
    radius: 24,
    label: 'Neon Killbox',
    color: '#ff2d6b',
  },
  {
    id: 'boss_crater',
    kind: 'boss',
    center: [-10, 55],
    radius: 22,
    label: 'Titan Crater',
    color: '#a855f7',
  },
];

export function zoneAt(x: number, z: number): WorldZone {
  // Prefer most specific (smallest radius) when overlapping.
  let best: WorldZone | null = null;
  for (const z0 of WORLD_ZONES) {
    const dx = x - z0.center[0];
    const dz = z - z0.center[1];
    if (dx * dx + dz * dz <= z0.radius * z0.radius) {
      if (!best || z0.radius < best.radius) best = z0;
    }
  }
  return (
    best || {
      id: 'open',
      kind: 'pve',
      center: [0, 0],
      radius: 999,
      label: 'Open Streets',
      color: '#5a5d62',
    }
  );
}

export function allowsPvp(zone: WorldZone, pvpFlag: boolean): boolean {
  if (zone.kind === 'safe') return false;
  if (zone.kind === 'pvp' || zone.kind === 'boss') return true;
  // Open PvE streets: only if both have open-world PvP armed.
  return pvpFlag;
}
