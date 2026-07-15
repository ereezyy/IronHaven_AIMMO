import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { spawnGhosts, ghostPosition } from '../game/ghostRunners';
import CharacterModel from './CharacterModel';

function GhostRunnerMesh({
  ghost,
}: {
  ghost: ReturnType<typeof spawnGhosts>[0];
}) {
  const group = useRef<THREE.Group>(null);
  const speedRef = useRef(0);
  const prev = useRef(new THREE.Vector3());

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() / 1000;
    const [x, y, z] = ghostPosition(ghost, t);
    const moved = prev.current.distanceToSquared(new THREE.Vector3(x, y, z));
    g.position.set(x, y, z);
    speedRef.current = Math.min(8, Math.sqrt(moved) * 40 + 1.5);
    // Face the orbit tangent: unflipped Soldier fronts -Z, so yaw = PI - a.
    g.rotation.y = Math.PI - (ghost.phase + t * ghost.speed);
    prev.current.set(x, y, z);
  });

  return (
    <group ref={group} position={[ghost.orbitR, 1, 0]}>
      <Html
        center
        position={[0, 2.6, 0]}
        distanceFactor={14}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            opacity: 0.72,
          }}
        >
          <div
            style={{
              color: '#8a9aaa',
              fontSize: 11,
              letterSpacing: '0.12em',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {ghost.clubTag ? `[${ghost.clubTag}] ` : ''}
            {ghost.username}
            <span style={{ color: '#5a5d62' }}> · lv {ghost.level}</span>
          </div>
        </div>
      </Html>
      <group position={[0, -1, 0]}>
        <CharacterModel speedRef={speedRef} tint="#6a7a8a" />
      </group>
    </group>
  );
}

/** Ambient offline runners when the shard has no live players. */
const GhostLayer: React.FC = () => {
  const ghosts = useMemo(() => spawnGhosts(6), []);
  return (
    <group>
      {ghosts.map((g) => (
        <GhostRunnerMesh key={g.id} ghost={g} />
      ))}
    </group>
  );
};

export default GhostLayer;
