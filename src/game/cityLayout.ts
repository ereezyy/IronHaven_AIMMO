export interface CityBuilding {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  neonColor: string;
  hasWindows: boolean;
  hasNeon: boolean;
}

export interface CityProp {
  id: string;
  position: [number, number, number];
}

export const CITY_RADIUS = 100;

// Deterministic PRNG (mulberry32). Seeding the district layout means the 3D
// world, the HUD minimap and any future server logic all agree on the same
// city without shipping a data file — and the streets stay put between
// sessions, so players can actually learn the map like in a real MMO.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x1a0eb7);

const BUILDING_COLORS = ['#15171a', '#121417', '#181a1e', '#1b1d22', '#101114'];

// Varied neon palette so the skyline reads as a living district rather than
// one repeated red sign. Picked per-building and reused by the sign mesh and
// its point light so glow and cast light always match.
const NEON_PALETTE = ['#ff2d6b', '#22d3ee', '#a855f7', '#f5a524', '#39ff14'];

export const CITY_BUILDINGS: CityBuilding[] = Array.from(
  { length: 50 },
  (_, i) => {
    const angle = (i / 50) * Math.PI * 2;
    const distance = 20 + rand() * 60;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const width = 3 + rand() * 5;
    const height = 10 + rand() * 30;
    const depth = 3 + rand() * 5;

    return {
      id: `building_${i}`,
      position: [x, height / 2, z] as [number, number, number],
      size: [width, height, depth] as [number, number, number],
      color: BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)],
      neonColor: NEON_PALETTE[Math.floor(rand() * NEON_PALETTE.length)],
      hasWindows: rand() > 0.3,
      hasNeon: rand() > 0.5,
    };
  }
);

export const CITY_TREES: CityProp[] = Array.from({ length: 30 }, (_, i) => {
  const angle = rand() * Math.PI * 2;
  const distance = 15 + rand() * 40;
  return {
    id: `tree_${i}`,
    position: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance] as [
      number,
      number,
      number,
    ],
  };
});

export const CITY_STREET_LIGHTS: CityProp[] = Array.from(
  { length: 20 },
  (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    return {
      id: `light_${i}`,
      position: [Math.cos(angle) * 50, 0, Math.sin(angle) * 50] as [
        number,
        number,
        number,
      ],
    };
  }
);
