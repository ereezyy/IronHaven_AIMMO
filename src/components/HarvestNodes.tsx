import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HARVEST_NODES,
  HARVEST_RANGE,
  type HarvestNode,
} from '../game/economy';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';

interface HarvestNodesProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  nearestRef: React.MutableRefObject<HarvestNode | null>;
  onNearest: (node: HarvestNode | null) => void;
  harvestApi: React.MutableRefObject<(() => boolean) | null>;
}

const HarvestNodes: React.FC<HarvestNodesProps> = ({
  playerPosRef,
  nearestRef,
  onNearest,
  harvestApi,
}) => {
  const cooldowns = useRef<Record<string, number>>({});
  const [, tick] = useState(0);
  const harvestIntoBag = useGameStore((s) => s.harvestIntoBag);

  const meshes = useMemo(() => HARVEST_NODES, []);

  useFrame(() => {
    const p = playerPosRef.current;
    let best: HarvestNode | null = null;
    let bestSq = HARVEST_RANGE * HARVEST_RANGE;
    const now = Date.now();
    for (const n of meshes) {
      if ((cooldowns.current[n.id] || 0) > now) continue;
      const dx = n.position[0] - p.x;
      const dz = n.position[2] - p.z;
      const d = dx * dx + dz * dz;
      if (d < bestSq) {
        bestSq = d;
        best = n;
      }
    }
    if (nearestRef.current?.id !== best?.id) {
      nearestRef.current = best;
      onNearest(best);
    }
  });

  React.useEffect(() => {
    harvestApi.current = () => {
      const n = nearestRef.current;
      if (!n) return false;
      const now = Date.now();
      if ((cooldowns.current[n.id] || 0) > now) return false;
      harvestIntoBag(n.yields);
      cooldowns.current[n.id] = now + n.cooldownMs;
      gameAudio.play('market', 0.2);
      tick((t) => t + 1);
      return true;
    };
    return () => {
      harvestApi.current = null;
    };
  }, [harvestApi, nearestRef, harvestIntoBag]);

  return (
    <group>
      {meshes.map((n) => {
        const onCd = (cooldowns.current[n.id] || 0) > Date.now();
        return (
          <group key={n.id} position={n.position}>
            <mesh castShadow position={[0, 0.4, 0]}>
              <boxGeometry args={[1.2, 0.8, 1.2]} />
              <meshStandardMaterial
                color={onCd ? '#222428' : n.color}
                emissive={onCd ? '#000' : n.color}
                emissiveIntensity={onCd ? 0 : 0.35}
                metalness={0.4}
                roughness={0.6}
                transparent
                opacity={onCd ? 0.45 : 0.95}
              />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial
                color={onCd ? '#333' : n.color}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export default HarvestNodes;
