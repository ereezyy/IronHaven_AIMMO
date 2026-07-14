/**
 * Faction territory control — stand on enemy/ally turf to flip control.
 */

import {
  FACTION_ZONES,
  type FactionId,
  type FactionZone,
  getFaction,
} from './factions';

export interface TerritoryState {
  /** zoneId → controlling faction */
  control: Record<string, FactionId>;
  /** zoneId → capture progress 0–100 for active flip */
  capture: Record<string, number>;
  /** zoneId → faction currently capturing */
  capturingBy: Record<string, FactionId | null>;
}

export function emptyTerritory(): TerritoryState {
  const control: Record<string, FactionId> = {};
  const capture: Record<string, number> = {};
  const capturingBy: Record<string, FactionId | null> = {};
  for (const z of FACTION_ZONES) {
    control[z.id] = z.factionId;
    capture[z.id] = 0;
    capturingBy[z.id] = null;
  }
  return { control, capture, capturingBy };
}

export function territoryAt(x: number, z: number): FactionZone | null {
  for (const z0 of FACTION_ZONES) {
    const dx = x - z0.center[0];
    const dz = z - z0.center[1];
    if (dx * dx + dz * dz <= z0.radius * z0.radius) return z0;
  }
  return null;
}

/**
 * Tick capture while player stands in a zone.
 * Allied/own turf: slowly reinforce. Enemy: flip.
 * Returns events for kill feed / standing.
 */
export function tickTerritory(
  state: TerritoryState,
  playerFaction: FactionId,
  x: number,
  z: number,
  deltaSec: number
): {
  state: TerritoryState;
  event: string | null;
  standingDelta: { id: FactionId; delta: number } | null;
} {
  const zone = territoryAt(x, z);
  if (!zone || playerFaction === 'null') {
    return { state, event: null, standingDelta: null };
  }

  const control = { ...state.control };
  const capture = { ...state.capture };
  const capturingBy = { ...state.capturingBy };
  const owner = control[zone.id] || zone.factionId;
  let event: string | null = null;
  let standingDelta: { id: FactionId; delta: number } | null = null;

  if (owner === playerFaction) {
    // Hold: decay enemy capture
    capture[zone.id] = Math.max(0, (capture[zone.id] || 0) - deltaSec * 8);
    capturingBy[zone.id] = null;
  } else {
    // Capture enemy / neutral-held
    if (capturingBy[zone.id] && capturingBy[zone.id] !== playerFaction) {
      capture[zone.id] = Math.max(0, (capture[zone.id] || 0) - deltaSec * 12);
      if ((capture[zone.id] || 0) <= 0) capturingBy[zone.id] = playerFaction;
    } else {
      capturingBy[zone.id] = playerFaction;
      capture[zone.id] = Math.min(100, (capture[zone.id] || 0) + deltaSec * 14);
      if ((capture[zone.id] || 0) >= 100) {
        control[zone.id] = playerFaction;
        capture[zone.id] = 0;
        capturingBy[zone.id] = null;
        const f = getFaction(playerFaction);
        event = `${f.name} took ${zone.label}`;
        standingDelta = { id: playerFaction, delta: 5 };
      }
    }
  }

  return {
    state: { control, capture, capturingBy },
    event,
    standingDelta,
  };
}

export function controlBonus(
  state: TerritoryState,
  playerFaction: FactionId
): { shopDiscount: number; xpMult: number; zonesHeld: number } {
  if (playerFaction === 'null') {
    return { shopDiscount: 0, xpMult: 1, zonesHeld: 0 };
  }
  let zonesHeld = 0;
  for (const id of Object.keys(state.control)) {
    if (state.control[id] === playerFaction) zonesHeld += 1;
  }
  return {
    zonesHeld,
    shopDiscount: Math.min(0.08, zonesHeld * 0.025),
    xpMult: 1 + Math.min(0.12, zonesHeld * 0.04),
  };
}
