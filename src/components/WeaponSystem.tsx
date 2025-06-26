import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  range: number;
  fireRate: number; // shots per second
  ammo: number;
  maxAmmo: number;
  reloadTime: number; // seconds
  weaponType: 'pistol' | 'rifle' | 'shotgun' | 'sniper' | 'energy';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const weapons: Weapon[] = [
  {
    id: 'cyber_pistol',
    name: 'Cyber Pistol',
    damage: 25,
    range: 15,
    fireRate: 3,
    ammo: 12,
    maxAmmo: 12,
    reloadTime: 1.5,
    weaponType: 'pistol',
    rarity: 'common'
  },
  {
    id: 'plasma_rifle',
    name: 'Plasma Rifle',
    damage: 45,
    range: 25,
    fireRate: 2,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 2.5,
    weaponType: 'rifle',
    rarity: 'rare'
  },
  {
    id: 'quantum_shotgun',
    name: 'Quantum Shotgun',
    damage: 80,
    range: 8,
    fireRate: 1,
    ammo: 6,
    maxAmmo: 6,
    reloadTime: 3,
    weaponType: 'shotgun',
    rarity: 'epic'
  },
  {
    id: 'neural_sniper',
    name: 'Neural Sniper',
    damage: 120,
    range: 50,
    fireRate: 0.5,
    ammo: 5,
    maxAmmo: 5,
    reloadTime: 4,
    weaponType: 'sniper',
    rarity: 'legendary'
  },
  {
    id: 'energy_cannon',
    name: 'Energy Cannon',
    damage: 100,
    range: 30,
    fireRate: 1.5,
    ammo: 20,
    maxAmmo: 20,
    reloadTime: 3.5,
    weaponType: 'energy',
    rarity: 'epic'
  }
];

interface WeaponSystemProps {
  position: [number, number, number];
  currentWeapon: Weapon;
  onFire: (weapon: Weapon, direction: [number, number, number]) => void;
  isReloading: boolean;
  aimDirection: [number, number, number];
}

interface MuzzleFlashProps {
  position: [number, number, number];
  visible: boolean;
  weaponType: string;
}

const MuzzleFlash: React.FC<MuzzleFlashProps> = ({ position, visible, weaponType }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.z += 0.5;
      meshRef.current.scale.setScalar(1 + Math.random() * 0.3);
    }
  });

  if (!visible) return null;

  const getFlashColor = () => {
    switch (weaponType) {
      case 'energy': return '#00ffff';
      case 'plasma': return '#ff00ff';
      case 'quantum': return '#ffff00';
      default: return '#ff6600';
    }
  };

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial
        color={getFlashColor()}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

const WeaponSystem: React.FC<WeaponSystemProps> = ({
  position,
  currentWeapon,
  onFire,
  isReloading,
  aimDirection
}) => {
  const weaponRef = useRef<THREE.Group>(null);
  const [muzzleFlash, setMuzzleFlash] = useState(false);
  const [lastFireTime, setLastFireTime] = useState(0);
  const [recoilOffset, setRecoilOffset] = useState(0);

  // Load weapon texture
  const weaponTexture = useLoader(TextureLoader, '/assets/cyberpunk_weapons.jpg');

  useEffect(() => {
    weaponTexture.magFilter = THREE.NearestFilter;
    weaponTexture.minFilter = THREE.NearestFilter;
  }, [weaponTexture]);

  useFrame((state) => {
    if (!weaponRef.current) return;

    const time = state.clock.elapsedTime;

    // Weapon sway animation
    const swayX = Math.sin(time * 2) * 0.02;
    const swayY = Math.cos(time * 1.5) * 0.01;
    
    // Apply recoil
    const recoilDecay = Math.max(0, recoilOffset - state.clock.getDelta() * 5);
    setRecoilOffset(recoilDecay);

    weaponRef.current.position.set(
      position[0] + swayX,
      position[1] + swayY - recoilDecay * 0.2,
      position[2]
    );

    // Aim weapon towards target
    const aimAngle = Math.atan2(aimDirection[2], aimDirection[0]);
    weaponRef.current.rotation.y = aimAngle;

    // Hide muzzle flash after short duration
    if (muzzleFlash && time - lastFireTime > 0.1) {
      setMuzzleFlash(false);
    }
  });

  const handleFire = () => {
    if (isReloading || currentWeapon.ammo <= 0) return;

    const now = Date.now() / 1000;
    const timeSinceLastFire = now - lastFireTime;
    const fireInterval = 1 / currentWeapon.fireRate;

    if (timeSinceLastFire >= fireInterval) {
      setMuzzleFlash(true);
      setLastFireTime(now);
      setRecoilOffset(0.5);
      onFire(currentWeapon, aimDirection);
    }
  };

  const getWeaponColor = () => {
    switch (currentWeapon.rarity) {
      case 'common': return '#888888';
      case 'rare': return '#0066ff';
      case 'epic': return '#9900ff';
      case 'legendary': return '#ff6600';
      default: return '#ffffff';
    }
  };

  const getWeaponScale = () => {
    switch (currentWeapon.weaponType) {
      case 'pistol': return [0.8, 0.3, 0.1];
      case 'rifle': return [1.5, 0.4, 0.1];
      case 'shotgun': return [1.2, 0.5, 0.15];
      case 'sniper': return [2, 0.3, 0.1];
      case 'energy': return [1.3, 0.6, 0.2];
      default: return [1, 0.4, 0.1];
    }
  };

  return (
    <group ref={weaponRef} onClick={handleFire}>
      {/* Main weapon body */}
      <mesh>
        <boxGeometry args={getWeaponScale()} />
        <meshStandardMaterial
          color={getWeaponColor()}
          emissive={getWeaponColor()}
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Weapon barrel */}
      <mesh position={[getWeaponScale()[0] / 2 + 0.2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4]} />
        <meshStandardMaterial
          color="#333333"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Weapon scope (for rifles and snipers) */}
      {(currentWeapon.weaponType === 'rifle' || currentWeapon.weaponType === 'sniper') && (
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6]} />
          <meshStandardMaterial
            color="#222222"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      )}

      {/* Energy core (for energy weapons) */}
      {currentWeapon.weaponType === 'energy' && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.15]} />
          <meshBasicMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.5 + Math.sin(Date.now() * 0.01) * 0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Muzzle flash */}
      <MuzzleFlash
        position={[getWeaponScale()[0] / 2 + 0.4, 0, 0]}
        visible={muzzleFlash}
        weaponType={currentWeapon.weaponType}
      />

      {/* Weapon glow effect */}
      <mesh>
        <boxGeometry args={[
          getWeaponScale()[0] * 1.2,
          getWeaponScale()[1] * 1.2,
          getWeaponScale()[2] * 1.2
        ]} />
        <meshBasicMaterial
          color={getWeaponColor()}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Reload indicator */}
      {isReloading && (
        <mesh position={[0, 0.8, 0]}>
          <planeGeometry args={[1, 0.2]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      )}

      {/* Ammo counter */}
      <mesh position={[0, -0.6, 0]}>
        <planeGeometry args={[0.8, 0.3]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
};

export default WeaponSystem;

