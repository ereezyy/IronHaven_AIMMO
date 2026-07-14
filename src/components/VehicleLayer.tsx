import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  VEHICLE_SPAWNS,
  VEHICLE_ENTER_RANGE,
  type VehicleSpawn,
} from '../game/vehicles';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';

export interface VehicleState {
  id: string | null;
  driving: boolean;
}

interface VehicleLayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  playerRotRef: React.MutableRefObject<number>;
  vehicleState: React.MutableRefObject<VehicleState>;
  nearestVehicleRef: React.MutableRefObject<VehicleSpawn | null>;
  onNearest: (v: VehicleSpawn | null) => void;
  enterApi: React.MutableRefObject<(() => boolean) | null>;
  exitApi: React.MutableRefObject<(() => void) | null>;
  /** When driving, player mesh should hide — parent reads this. */
  drivingRef: React.MutableRefObject<boolean>;
  onDriverUpdate: (pos: THREE.Vector3, rot: number) => void;
  onDrivingChange?: (driving: boolean) => void;
}

function VehicleMesh({
  spawn,
  groupRef,
}: {
  spawn: VehicleSpawn;
  groupRef: (el: THREE.Group | null) => void;
}) {
  if (spawn.kind === 'bike') {
    return (
      <group
        ref={groupRef}
        position={spawn.position}
        rotation={[0, spawn.rotation, 0]}
      >
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[0.5, 0.4, 1.6]} />
          <meshStandardMaterial
            color={spawn.color}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 0.25, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.15, 12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.25, -0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.15, 12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    );
  }
  if (spawn.kind === 'hauler') {
    return (
      <group
        ref={groupRef}
        position={spawn.position}
        rotation={[0, spawn.rotation, 0]}
      >
        <mesh castShadow position={[0, 0.7, 0]}>
          <boxGeometry args={[2.2, 1.2, 3.6]} />
          <meshStandardMaterial
            color={spawn.color}
            metalness={0.45}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 1.5, 0.6]}>
          <boxGeometry args={[2, 0.7, 1.4]} />
          <meshStandardMaterial
            color="#1a1c20"
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
      </group>
    );
  }
  return (
    <group
      ref={groupRef}
      position={spawn.position}
      rotation={[0, spawn.rotation, 0]}
    >
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.8, 0.7, 3.2]} />
        <meshStandardMaterial
          color={spawn.color}
          metalness={0.55}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 1.05, -0.2]}>
        <boxGeometry args={[1.5, 0.55, 1.6]} />
        <meshStandardMaterial
          color="#0a1018"
          metalness={0.7}
          roughness={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

const VehicleLayer: React.FC<VehicleLayerProps> = ({
  playerPosRef,
  playerRotRef,
  vehicleState,
  nearestVehicleRef,
  onNearest,
  enterApi,
  exitApi,
  drivingRef,
  onDriverUpdate,
  onDrivingChange,
}) => {
  const spawns = useMemo(() => VEHICLE_SPAWNS.map((s) => ({ ...s })), []);
  const groups = useRef<Record<string, THREE.Group | null>>({});
  const vel = useRef(new THREE.Vector3());
  const [, getKeys] = useKeyboardControls();
  const drivingSkill = useGameStore((s) => s.playerStats.skills.driving);

  useFrame((_, delta) => {
    const p = playerPosRef.current;
    const activeId = vehicleState.current.id;
    const driving = vehicleState.current.driving;

    if (!driving) {
      let best: VehicleSpawn | null = null;
      let bestSq = VEHICLE_ENTER_RANGE * VEHICLE_ENTER_RANGE;
      for (const s of spawns) {
        const g = groups.current[s.id];
        if (!g) continue;
        const dx = g.position.x - p.x;
        const dz = g.position.z - p.z;
        const d = dx * dx + dz * dz;
        if (d < bestSq) {
          bestSq = d;
          best = s;
        }
      }
      if (nearestVehicleRef.current?.id !== best?.id) {
        nearestVehicleRef.current = best;
        onNearest(best);
      }
      return;
    }

    // Driving physics — arcade, skill-scaled.
    const spawn = spawns.find((s) => s.id === activeId);
    const g = activeId ? groups.current[activeId] : null;
    if (!spawn || !g) return;

    const { forward, backward, left, right } = getKeys();
    const mods = useGameStore.getState().getModifiers();
    const buffs = useGameStore.getState().buffs;
    const driveBuff = Date.now() < buffs.driveUntil ? buffs.driveMult : 1;
    const maxSpeed =
      spawn.maxSpeed * (0.85 + drivingSkill / 80) * mods.driveSpeed * driveBuff;
    const accel = (28 + drivingSkill * 0.4) * mods.driveSpeed;
    const turn = 2.1 + drivingSkill * 0.02;

    if (left) g.rotation.y += turn * delta;
    if (right) g.rotation.y -= turn * delta;

    const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      g.rotation.y
    );
    if (forward) vel.current.addScaledVector(dir, accel * delta);
    if (backward) vel.current.addScaledVector(dir, -accel * 0.6 * delta);
    vel.current.multiplyScalar(Math.max(0, 1 - 2.2 * delta));
    if (vel.current.length() > maxSpeed) {
      vel.current.setLength(maxSpeed);
    }

    g.position.x += vel.current.x * delta;
    g.position.z += vel.current.z * delta;

    // World clamp
    const r = Math.sqrt(g.position.x ** 2 + g.position.z ** 2);
    if (r > 95) {
      g.position.x = (g.position.x / r) * 95;
      g.position.z = (g.position.z / r) * 95;
      vel.current.set(0, 0, 0);
    }

    playerPosRef.current.set(g.position.x, 1.2, g.position.z);
    playerRotRef.current = g.rotation.y;
    onDriverUpdate(playerPosRef.current, g.rotation.y);
  });

  React.useEffect(() => {
    enterApi.current = () => {
      const v = nearestVehicleRef.current;
      if (!v || vehicleState.current.driving) return false;
      vehicleState.current = { id: v.id, driving: true };
      drivingRef.current = true;
      onDrivingChange?.(true);
      vel.current.set(0, 0, 0);
      gameAudio.play('market', 0.2);
      return true;
    };
    exitApi.current = () => {
      if (!vehicleState.current.driving) return;
      const id = vehicleState.current.id;
      const g = id ? groups.current[id] : null;
      if (g) {
        // Pop player beside vehicle.
        playerPosRef.current.set(g.position.x + 2, 1, g.position.z);
      }
      vehicleState.current = { id: null, driving: false };
      drivingRef.current = false;
      onDrivingChange?.(false);
      vel.current.set(0, 0, 0);
      gameAudio.play('ui', 0.15);
    };
    return () => {
      enterApi.current = null;
      exitApi.current = null;
    };
  }, [
    enterApi,
    exitApi,
    nearestVehicleRef,
    vehicleState,
    drivingRef,
    playerPosRef,
    onDrivingChange,
  ]);

  return (
    <group>
      {spawns.map((s) => (
        <VehicleMesh
          key={s.id}
          spawn={s}
          groupRef={(el) => {
            groups.current[s.id] = el;
          }}
        />
      ))}
    </group>
  );
};

export default VehicleLayer;
