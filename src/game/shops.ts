// World shops — distinct vendors with fixed catalogs.

import type { ResourceId } from './economy';

export type ShopKind = 'general' | 'armory' | 'chem' | 'fishmonger';

export interface ShopItem {
  kind: 'resource' | 'weapon' | 'service';
  id: string;
  name: string;
  price: number;
  /** For services: heal, clear_heat, etc. */
  service?: 'heal' | 'clear_heat' | 'repair';
}

export interface WorldShop {
  id: string;
  name: string;
  kind: ShopKind;
  position: [number, number, number];
  color: string;
  factionId?: string;
  items: ShopItem[];
}

export const WORLD_SHOPS: WorldShop[] = [
  {
    id: 'shop_night_market',
    name: 'Night Market',
    kind: 'general',
    position: [0, 0, 18],
    color: '#f5a524',
    items: [
      { kind: 'resource', id: 'scrap', name: 'Scrap Metal', price: 35 },
      { kind: 'resource', id: 'circuits', name: 'Circuits', price: 70 },
      { kind: 'resource', id: 'chems', name: 'Street Chems', price: 55 },
      { kind: 'service', id: 'heal', name: 'Med Patch (+50 HP)', price: 200, service: 'heal' },
    ],
  },
  {
    id: 'shop_armory',
    name: 'Chrome Armory',
    kind: 'armory',
    position: [-38, 0, 28],
    color: '#3f7d9a',
    factionId: 'chrome_guard',
    items: [
      { kind: 'weapon', id: 'cyber_pistol', name: 'Cyber Pistol', price: 450 },
      { kind: 'weapon', id: 'plasma_rifle', name: 'Plasma Rifle', price: 1400 },
      { kind: 'resource', id: 'armor_plate', name: 'Armor Plate', price: 180 },
      { kind: 'service', id: 'repair', name: 'Field Repair', price: 150, service: 'repair' },
    ],
  },
  {
    id: 'shop_chem',
    name: 'Vial & Vein',
    kind: 'chem',
    position: [42, 0, -22],
    color: '#a855f7',
    factionId: 'neon_syndicate',
    items: [
      { kind: 'resource', id: 'stim_vial', name: 'Stim Vial', price: 130 },
      { kind: 'resource', id: 'chems', name: 'Chems', price: 50 },
      { kind: 'resource', id: 'nano_fiber', name: 'Nano Fiber', price: 110 },
      { kind: 'service', id: 'heal', name: 'Full Stim (+100 HP)', price: 400, service: 'heal' },
    ],
  },
  {
    id: 'shop_fish',
    name: 'Dockmonger',
    kind: 'fishmonger',
    position: [28, 0, 48],
    color: '#39ff14',
    factionId: 'dock_rats',
    items: [
      { kind: 'resource', id: 'fuel_cell', name: 'Fuel Cell', price: 90 },
      { kind: 'service', id: 'clear_heat', name: 'Lose the Heat', price: 350, service: 'clear_heat' },
      { kind: 'resource', id: 'scrap', name: 'Scrap', price: 30 },
    ],
  },
];

export const SHOP_RANGE = 3.5;

export function isResourceId(id: string): id is ResourceId {
  return [
    'scrap',
    'circuits',
    'chems',
    'nano_fiber',
    'stim_vial',
    'armor_plate',
    'fuel_cell',
  ].includes(id);
}
