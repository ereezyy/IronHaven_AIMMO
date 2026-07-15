import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SAFEHOUSE, isNearSafehouse } from '../game/safehouse';

interface SafehouseLayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  nearRef: React.MutableRefObject<boolean>;
  onNear: (near: boolean) => void;
}

/**
 * The Den — player safehouse shell inside the Spawn Sanctum. Proximity is
 * polled per frame (same pattern as ShopLayer); the interior itself is a UI
 * panel, so no scene switch or extra physics is needed.
 */
const SafehouseLayer: React.FC<SafehouseLayerProps> = ({
  playerPosRef,
  nearRef,
  onNear,
}) => {
  useFrame(() => {
    const p = playerPosRef.current;
    const near = isNearSafehouse(p.x, p.z);
    if (nearRef.current !== near) {
      nearRef.current = near;
      onNear(near);
    }
  });

  const [x, , z] = SAFEHOUSE.position;

  return (
    <group position={[x, 0, z]}>
      {/* Bunker shell */}
      <mesh castShadow position={[0, 1.6, 0]}>
        <boxGeometry args={[5, 3.2, 4]} />
        <meshStandardMaterial
          color="#101114"
          metalness={0.35}
          roughness={0.6}
        />
      </mesh>
      {/* Recessed door */}
      <mesh position={[0, 1.1, 2.01]}>
        <boxGeometry args={[1.3, 2.2, 0.08]} />
        <meshStandardMaterial color="#050506" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Sign over the door */}
      <mesh position={[0, 2.9, 2.05]}>
        <boxGeometry args={[2.4, 0.4, 0.1]} />
        <meshStandardMaterial
          color="#050506"
          emissive={SAFEHOUSE.color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {/* Door strip lights */}
      <mesh position={[-0.75, 1.1, 2.03]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial
          color="#050506"
          emissive={SAFEHOUSE.color}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.75, 1.1, 2.03]}>
        <boxGeometry args={[0.06, 2.2, 0.06]} />
        <meshStandardMaterial
          color="#050506"
          emissive={SAFEHOUSE.color}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, 2.4, 2.6]}
        color={SAFEHOUSE.color}
        intensity={0.9}
        distance={10}
      />
    </group>
  );
};

export default SafehouseLayer;
