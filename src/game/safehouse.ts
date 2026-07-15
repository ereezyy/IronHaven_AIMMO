// Safehouse: player den inside the Spawn Sanctum. Pure data — the 3D shell
// lives in SafehouseLayer, the interior UI in SafehousePanel.

export interface Safehouse {
  id: string;
  name: string;
  /** Door position on the ground plane (y = 0). */
  position: [number, number, number];
  color: string;
}

// Inside the safe_spawn zone (center [0,0], r=14) and clear of the building
// ring (all CITY_BUILDINGS spawn at distance >= 20 from origin).
export const SAFEHOUSE: Safehouse = {
  id: 'safehouse_spawn',
  name: 'The Den',
  position: [-10, 0, -8],
  color: '#3f7d4e',
};

/** Interaction range from the door, matches SHOP_RANGE feel. */
export const SAFEHOUSE_RANGE = 3.5;

export function isNearSafehouse(x: number, z: number): boolean {
  const dx = x - SAFEHOUSE.position[0];
  const dz = z - SAFEHOUSE.position[2];
  return dx * dx + dz * dz <= SAFEHOUSE_RANGE * SAFEHOUSE_RANGE;
}
