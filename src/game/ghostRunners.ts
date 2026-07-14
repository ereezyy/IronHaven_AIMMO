/**
 * Offline ambient "ghost" runners so the district never feels empty.
 */

export interface GhostRunner {
  id: string;
  username: string;
  level: number;
  /** Orbit radius / phase for simple motion. */
  orbitR: number;
  phase: number;
  speed: number;
  y: number;
  clubTag?: string;
}

const NAMES = [
  'Ash_9',
  'Vexwire',
  'Nyx',
  'Rook7',
  'Saltline',
  'Crowbit',
  'Mara_X',
  'Pike',
  'Wren',
  'DexNull',
  'Hexa',
  'Kite',
];

export function spawnGhosts(count = 6, seed = 2087): GhostRunner[] {
  let s = seed | 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
  const ghosts: GhostRunner[] = [];
  for (let i = 0; i < count; i++) {
    ghosts.push({
      id: `ghost_${i}`,
      username: NAMES[i % NAMES.length],
      level: 2 + Math.floor(rand() * 12),
      orbitR: 18 + rand() * 55,
      phase: rand() * Math.PI * 2,
      speed: 0.15 + rand() * 0.35,
      y: 1,
      clubTag: rand() > 0.7 ? 'GHST' : undefined,
    });
  }
  return ghosts;
}

export function ghostPosition(
  g: GhostRunner,
  timeSec: number
): [number, number, number] {
  const a = g.phase + timeSec * g.speed;
  return [Math.cos(a) * g.orbitR, g.y, Math.sin(a) * g.orbitR];
}
