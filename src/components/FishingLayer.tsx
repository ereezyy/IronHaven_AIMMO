import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  FISH_SPOTS,
  FISH_RANGE,
  CAST_MS,
  rollFish,
  type FishSpot,
} from '../game/fishing';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';

interface FishingLayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  nearestRef: React.MutableRefObject<FishSpot | null>;
  onNearest: (s: FishSpot | null) => void;
  castApi: React.MutableRefObject<(() => void) | null>;
  fishingRef: React.MutableRefObject<boolean>;
}

const FishingLayer: React.FC<FishingLayerProps> = ({
  playerPosRef,
  nearestRef,
  onNearest,
  castApi,
  fishingRef,
}) => {
  const castingUntil = useRef(0);
  const [, bump] = useState(0);
  const addFish = useGameStore((s) => s.addFish);

  useFrame(() => {
    const p = playerPosRef.current;
    let best: FishSpot | null = null;
    let bestSq = FISH_RANGE * FISH_RANGE;
    for (const s of FISH_SPOTS) {
      const dx = s.position[0] - p.x;
      const dz = s.position[2] - p.z;
      const d = dx * dx + dz * dz;
      if (d < bestSq) {
        bestSq = d;
        best = s;
      }
    }
    if (nearestRef.current?.id !== best?.id) {
      nearestRef.current = best;
      onNearest(best);
    }

    if (castingUntil.current > 0 && Date.now() >= castingUntil.current) {
      castingUntil.current = 0;
      fishingRef.current = false;
      const spot = nearestRef.current;
      if (spot) {
        const st = useGameStore.getState();
        let rare = st.getModifiers().fishChance;
        if (st.isPassActive()) rare += 0.05; // PASS_BENEFITS.fishChanceBonus
        const fish = rollFish(spot, Math.random, rare);
        addFish(fish.id);
        gameAudio.play('talk', 0.25);
        bump((n) => n + 1);
      }
    }
  });

  React.useEffect(() => {
    castApi.current = () => {
      if (!nearestRef.current) return;
      if (castingUntil.current > Date.now()) return;
      castingUntil.current = Date.now() + CAST_MS;
      fishingRef.current = true;
      gameAudio.play('ui', 0.15);
      bump((n) => n + 1);
    };
    return () => {
      castApi.current = null;
    };
  }, [castApi, nearestRef, fishingRef]);

  return (
    <group>
      {FISH_SPOTS.map((s) => (
        <group key={s.id} position={s.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[2.2, 24]} />
            <meshStandardMaterial
              color="#0a2030"
              metalness={0.7}
              roughness={0.2}
              transparent
              opacity={0.75}
            />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
            <meshStandardMaterial color="#5a4030" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export default FishingLayer;
