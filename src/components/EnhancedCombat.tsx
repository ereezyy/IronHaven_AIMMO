import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameState';
import * as THREE from 'three';

interface CombatEffect {
  id: string;
  position: [number, number, number];
  type: 'muzzle_flash' | 'blood_spray' | 'impact_spark' | 'explosion' | 'death_burst';
  intensity: number;
  duration: number;
  startTime: number;
}

interface EnhancedCombatProps {
  effects: CombatEffect[];
  onEffectComplete: (id: string) => void;
}

const EnhancedCombat: React.FC<EnhancedCombatProps> = ({ effects, onEffectComplete }) => {
  const [screenShake, setScreenShake] = useState({ intensity: 0, duration: 0 });
  const [bulletTime, setBulletTime] = useState(false);
  const cameraRef = useRef<THREE.Camera>();

  useFrame((state, delta) => {
    // Screen shake effect
    if (screenShake.intensity > 0) {
      const camera = state.camera;
      const shakeAmount = screenShake.intensity * 0.02;
      
      camera.position.x += (Math.random() - 0.5) * shakeAmount;
      camera.position.y += (Math.random() - 0.5) * shakeAmount;
      camera.position.z += (Math.random() - 0.5) * shakeAmount;
      
      setScreenShake(prev => ({
        intensity: Math.max(0, prev.intensity - delta * 5),
        duration: Math.max(0, prev.duration - delta)
      }));
    }
  });

  // Trigger effects based on combat actions
  useEffect(() => {
    effects.forEach(effect => {
      if (effect.type === 'explosion') {
        setScreenShake({ intensity: effect.intensity * 10, duration: 0.5 });
      } else if (effect.type === 'muzzle_flash') {
        setScreenShake({ intensity: effect.intensity * 2, duration: 0.1 });
      }
      
      // Bullet time for dramatic moments
      if (effect.intensity > 0.8) {
        setBulletTime(true);
        setTimeout(() => setBulletTime(false), 200);
      }
      
      // Auto-complete effect
      setTimeout(() => {
        onEffectComplete(effect.id);
      }, effect.duration);
    });
  }, [effects]);

  return (
    <>
      {effects.map(effect => (
        <CombatEffectRenderer key={effect.id} effect={effect} />
      ))}
      
      {/* Bullet time visual indicator */}
      {bulletTime && (
        <mesh position={[0, 10, 0]}>
          <sphereGeometry args={[50, 16, 16]} />
          <meshBasicMaterial 
            color="#ffff00" 
            transparent 
            opacity={0.05}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </>
  );
};

const CombatEffectRenderer: React.FC<{ effect: CombatEffect }> = ({ effect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);

  useFrame((state, delta) => {
    const age = (Date.now() - effect.startTime) / effect.duration;
    
    if (effect.type === 'explosion') {
      setScale(1 + age * 3);
      setOpacity(1 - age);
    } else if (effect.type === 'muzzle_flash') {
      setScale(1 + age * 0.5);
      setOpacity(1 - age * 2);
    } else if (effect.type === 'blood_spray') {
      setScale(1 + age * 1.5);
      setOpacity(Math.max(0, 1 - age * 0.8));
    }
    
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale * effect.intensity);
    }
  });

  const getEffectGeometry = () => {
    switch (effect.type) {
      case 'explosion':
        return <sphereGeometry args={[2, 16, 16]} />;
      case 'muzzle_flash':
        return <coneGeometry args={[0.5, 2, 8]} />;
      case 'blood_spray':
        return <sphereGeometry args={[1, 8, 8]} />;
      case 'impact_spark':
        return <sphereGeometry args={[0.3, 6, 6]} />;
      default:
        return <sphereGeometry args={[1, 8, 8]} />;
    }
  };

  const getEffectMaterial = () => {
    const baseProps = {
      transparent: true,
      opacity: opacity,
      emissiveIntensity: 2,
      blending: THREE.AdditiveBlending
    };

    switch (effect.type) {
      case 'explosion':
        return <meshBasicMaterial {...baseProps} color="#ff4500" emissive="#ff4500" />;
      case 'muzzle_flash':
        return <meshBasicMaterial {...baseProps} color="#ffff00" emissive="#ffff00" />;
      case 'blood_spray':
        return <meshBasicMaterial {...baseProps} color="#8B0000" emissive="#8B0000" />;
      case 'impact_spark':
        return <meshBasicMaterial {...baseProps} color="#ffffff" emissive="#ffffff" />;
      default:
        return <meshBasicMaterial {...baseProps} color="#ffffff" />;
    }
  };

  return (
    <mesh ref={meshRef} position={effect.position}>
      {getEffectGeometry()}
      {getEffectMaterial()}
    </mesh>
  );
};

export default EnhancedCombat;
export type { CombatEffect };