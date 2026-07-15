// Harvest → craft → trade loop. Pure data + pure functions for tests.

export type ResourceId =
  | 'scrap'
  | 'circuits'
  | 'chems'
  | 'nano_fiber'
  | 'stim_vial'
  | 'armor_plate'
  | 'fuel_cell';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Street buy price at black market / traders. */
  buy: number;
  /** Street sell price. */
  sell: number;
}

export const RESOURCES: ResourceDef[] = [
  { id: 'scrap', name: 'Scrap Metal', buy: 40, sell: 18 },
  { id: 'circuits', name: 'Burned Circuits', buy: 80, sell: 35 },
  { id: 'chems', name: 'Street Chems', buy: 60, sell: 28 },
  { id: 'nano_fiber', name: 'Nano Fiber', buy: 120, sell: 55 },
  { id: 'stim_vial', name: 'Stim Vial', buy: 150, sell: 70 },
  { id: 'armor_plate', name: 'Armor Plate', buy: 200, sell: 90 },
  { id: 'fuel_cell', name: 'Fuel Cell', buy: 100, sell: 45 },
];

export type ResourceBag = Record<ResourceId, number>;

export function emptyBag(): ResourceBag {
  return {
    scrap: 0,
    circuits: 0,
    chems: 0,
    nano_fiber: 0,
    stim_vial: 0,
    armor_plate: 0,
    fuel_cell: 0,
  };
}

export interface HarvestNode {
  id: string;
  kind: 'scrap_pile' | 'chem_cache' | 'tech_wreck' | 'fuel_dump';
  position: [number, number, number];
  yields: Partial<ResourceBag>;
  cooldownMs: number;
  label: string;
  color: string;
}

// Deterministic district salvage points (match city seed vibe).
export const HARVEST_NODES: HarvestNode[] = [
  {
    id: 'h_scrap_n',
    kind: 'scrap_pile',
    position: [18, 0, -12],
    yields: { scrap: 3, circuits: 1 },
    cooldownMs: 12000,
    label: 'Scrap Pile',
    color: '#8a8d92',
  },
  {
    id: 'h_chem_e',
    kind: 'chem_cache',
    position: [-22, 0, 16],
    yields: { chems: 2, stim_vial: 1 },
    cooldownMs: 16000,
    label: 'Chem Cache',
    color: '#39ff14',
  },
  {
    id: 'h_tech_s',
    kind: 'tech_wreck',
    position: [8, 0, 28],
    yields: { circuits: 2, nano_fiber: 1 },
    cooldownMs: 18000,
    label: 'Tech Wreck',
    color: '#22d3ee',
  },
  {
    id: 'h_fuel_w',
    kind: 'fuel_dump',
    position: [-30, 0, -20],
    yields: { fuel_cell: 2, scrap: 1 },
    cooldownMs: 14000,
    label: 'Fuel Dump',
    color: '#f5a524',
  },
  {
    id: 'h_scrap_c',
    kind: 'scrap_pile',
    position: [32, 0, 8],
    yields: { scrap: 2, armor_plate: 1 },
    cooldownMs: 20000,
    label: 'Armored Debris',
    color: '#a855f7',
  },
  {
    id: 'h_tech_n',
    kind: 'tech_wreck',
    position: [-12, 0, -32],
    yields: { circuits: 1, nano_fiber: 2, chems: 1 },
    cooldownMs: 22000,
    label: 'Drone Shell',
    color: '#c03a30',
  },
];

export const HARVEST_RANGE = 3.2;

export interface Recipe {
  id: string;
  name: string;
  /** Crafted bag item id (weapon or consumable). */
  output: string;
  outputKind: 'weapon' | 'consumable' | 'resource';
  outputQty: number;
  cost: Partial<ResourceBag>;
  money?: number;
  description: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'craft_pistol',
    name: 'Jury-Rig Pistol',
    output: 'cyber_pistol',
    outputKind: 'weapon',
    outputQty: 1,
    cost: { scrap: 4, circuits: 2 },
    money: 100,
    description: 'Scrap-built sidearm. Better than fists.',
  },
  {
    id: 'craft_stim',
    name: 'Street Stim',
    output: 'stim_vial',
    outputKind: 'resource',
    outputQty: 2,
    cost: { chems: 2, nano_fiber: 1 },
    description: 'Two stim vials for the field.',
  },
  {
    id: 'craft_plate',
    name: 'Patch Armor',
    output: 'armor_plate',
    outputKind: 'resource',
    outputQty: 1,
    cost: { scrap: 3, nano_fiber: 2 },
    money: 50,
    description: 'Sell or trade for protection cash.',
  },
  {
    id: 'craft_rifle',
    name: 'Plasma Rifle Kit',
    output: 'plasma_rifle',
    outputKind: 'weapon',
    outputQty: 1,
    cost: { scrap: 6, circuits: 4, fuel_cell: 2, nano_fiber: 2 },
    money: 400,
    description: 'Serious heat. Serious cost.',
  },
  {
    id: 'craft_fuel',
    name: 'Refine Fuel',
    output: 'fuel_cell',
    outputKind: 'resource',
    outputQty: 2,
    cost: { chems: 1, scrap: 2 },
    description: 'Keep the rigs running.',
  },
];

export function canCraft(
  bag: ResourceBag,
  money: number,
  recipe: Recipe
): boolean {
  if ((recipe.money || 0) > money) return false;
  for (const [k, need] of Object.entries(recipe.cost)) {
    if ((bag[k as ResourceId] || 0) < (need || 0)) return false;
  }
  return true;
}

export function applyCraft(
  bag: ResourceBag,
  money: number,
  recipe: Recipe
): { bag: ResourceBag; money: number } | null {
  if (!canCraft(bag, money, recipe)) return null;
  const next = { ...bag };
  for (const [k, need] of Object.entries(recipe.cost)) {
    next[k as ResourceId] -= need || 0;
  }
  if (recipe.outputKind === 'resource') {
    next[recipe.output as ResourceId] =
      (next[recipe.output as ResourceId] || 0) + recipe.outputQty;
  }
  return {
    bag: next,
    money: money - (recipe.money || 0),
  };
}

export function applyHarvest(
  bag: ResourceBag,
  yields: Partial<ResourceBag>
): ResourceBag {
  const next = { ...bag };
  for (const [k, v] of Object.entries(yields)) {
    next[k as ResourceId] = (next[k as ResourceId] || 0) + (v || 0);
  }
  return next;
}

export function tradeBuy(
  bag: ResourceBag,
  money: number,
  id: ResourceId,
  qty: number
): { bag: ResourceBag; money: number } | null {
  const def = RESOURCES.find((r) => r.id === id);
  if (!def || qty < 1) return null;
  const cost = def.buy * qty;
  if (money < cost) return null;
  return {
    bag: { ...bag, [id]: (bag[id] || 0) + qty },
    money: money - cost,
  };
}

export function tradeSell(
  bag: ResourceBag,
  money: number,
  id: ResourceId,
  qty: number
): { bag: ResourceBag; money: number } | null {
  const def = RESOURCES.find((r) => r.id === id);
  if (!def || qty < 1 || (bag[id] || 0) < qty) return null;
  return {
    bag: { ...bag, [id]: bag[id] - qty },
    money: money + def.sell * qty,
  };
}

export function resourceName(id: string): string {
  return RESOURCES.find((r) => r.id === id)?.name || id;
}

/** Move qty of a resource between two bags (bag ↔ safehouse stash). */
export function transferResource(
  from: ResourceBag,
  to: ResourceBag,
  id: ResourceId,
  qty: number
): { from: ResourceBag; to: ResourceBag } | null {
  if (qty < 1 || (from[id] || 0) < qty) return null;
  return {
    from: { ...from, [id]: from[id] - qty },
    to: { ...to, [id]: (to[id] || 0) + qty },
  };
}
