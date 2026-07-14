// Fishing loop — cast, wait, catch. Pure tables for tests.

export type FishId =
  | 'neon_minnow'
  | 'chrome_bass'
  | 'toxic_eel'
  | 'void_koi'
  | 'scrap_boot';

export interface FishDef {
  id: FishId;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  sell: number;
  weight: number; // spawn weight
}

export const FISH: FishDef[] = [
  { id: 'scrap_boot', name: 'Rusted Boot', rarity: 'common', sell: 5, weight: 20 },
  { id: 'neon_minnow', name: 'Neon Minnow', rarity: 'common', sell: 25, weight: 40 },
  { id: 'chrome_bass', name: 'Chrome Bass', rarity: 'uncommon', sell: 80, weight: 25 },
  { id: 'toxic_eel', name: 'Toxic Eel', rarity: 'rare', sell: 180, weight: 12 },
  { id: 'void_koi', name: 'Void Koi', rarity: 'legendary', sell: 600, weight: 3 },
];

export interface FishSpot {
  id: string;
  position: [number, number, number];
  label: string;
  bonus: FishId[];
}

export const FISH_SPOTS: FishSpot[] = [
  {
    id: 'fish_docks',
    position: [35, 0, 52],
    label: 'Rat Pier',
    bonus: ['chrome_bass', 'neon_minnow'],
  },
  {
    id: 'fish_canal',
    position: [-20, 0, -45],
    label: 'Toxic Canal',
    bonus: ['toxic_eel', 'scrap_boot'],
  },
  {
    id: 'fish_mirror',
    position: [5, 0, -55],
    label: 'Mirror Pool',
    bonus: ['void_koi', 'neon_minnow'],
  },
];

export const FISH_RANGE = 3.0;
export const CAST_MS = 2800;

export type FishBag = Record<FishId, number>;

export function emptyFishBag(): FishBag {
  return {
    neon_minnow: 0,
    chrome_bass: 0,
    toxic_eel: 0,
    void_koi: 0,
    scrap_boot: 0,
  };
}

export function rollFish(
  spot: FishSpot,
  rng = Math.random,
  rareBonus = 0
): FishDef {
  const pool: FishDef[] = [];
  for (const f of FISH) {
    let w = f.weight;
    if (spot.bonus.includes(f.id)) w *= 2.2;
    // rareBonus from skills boosts uncommon+
    if (f.rarity !== 'common') w *= 1 + rareBonus * 3;
    for (let i = 0; i < Math.max(1, Math.round(w)); i++) pool.push(f);
  }
  return pool[Math.floor(rng() * pool.length)] || FISH[0];
}

export function sellAllFish(bag: FishBag): { bag: FishBag; money: number } {
  let money = 0;
  const next = emptyFishBag();
  for (const f of FISH) {
    money += (bag[f.id] || 0) * f.sell;
  }
  return { bag: next, money };
}
