// District vehicles — pure spawn data.

export type VehicleKind = 'cruiser' | 'bike' | 'hauler';

export interface VehicleSpawn {
  id: string;
  kind: VehicleKind;
  position: [number, number, number];
  rotation: number;
  color: string;
  maxSpeed: number;
  label: string;
}

export const VEHICLE_SPAWNS: VehicleSpawn[] = [
  {
    id: 'v_cruiser_1',
    kind: 'cruiser',
    position: [10, 0, 6],
    rotation: 0.4,
    color: '#2a2d33',
    maxSpeed: 16,
    label: 'Street Cruiser',
  },
  {
    id: 'v_bike_1',
    kind: 'bike',
    position: [-14, 0, 4],
    rotation: -0.8,
    color: '#c03a30',
    maxSpeed: 20,
    label: 'Pulse Bike',
  },
  {
    id: 'v_hauler_1',
    kind: 'hauler',
    position: [24, 0, -18],
    rotation: 1.2,
    color: '#3a4038',
    maxSpeed: 12,
    label: 'Scrap Hauler',
  },
  {
    id: 'v_cruiser_2',
    kind: 'cruiser',
    position: [-26, 0, 22],
    rotation: 2.1,
    color: '#1e2430',
    maxSpeed: 15,
    label: 'Metro Cruiser',
  },
];

export const VEHICLE_ENTER_RANGE = 3.5;
