import React, { useState, useEffect } from 'react';
import * as THREE from 'three';

interface CombatEffect {
  id: string;
  position: [number, number, number];
  type: 'blood_splatter' | 'muzzle_flash' | 'impact' | 'explosion';
  duration: number;
  startTime: number;
}

interface CombatSystemProps {
  effects: CombatEffect[];
  onEffectComplete: (id: string) => void;
}

const CombatSystem: React.FC<CombatSystemProps> = ({ effects, onEffectComplete }) => {
  useEffect(() => {
    effects.forEach(effect => {
      const timer = setTimeout(() => {
        onEffectComplete(effect.id);
      }, effect.duration);

      return () => clearTimeout(timer);
    });
  }, [effects, onEffectComplete]);

  return (
    <>
      {effects.map(effect => (
        <EffectRenderer key={effect.id} effect={effect} />
      ))}
    </>
  );
};

const EffectRenderer: React.FC<{ effect: CombatEffect }> = ({ effect }) => {
  const getEffectColor = () => {
    switch (effect.type) {
      case 'blood_splatter': return '#8B0000';
      case 'muzzle_flash': return '#FFD700';
      case 'impact': return '#FFFFFF';
      case 'explosion': return '#FF4500';
      default: return '#FFFFFF';
    }
  };

  const getEffectSize = () => {
    switch (effect.type) {
      case 'blood_splatter': return [2, 2, 0.1];
      case 'muzzle_flash': return [0.5, 0.5, 1];
      case 'impact': return [0.3, 0.3, 0.3];
      case 'explosion': return [5, 5, 5];
      default: return [1, 1, 1];
    }
  };

  if (effect.type === 'blood_splatter') {
    return (
      <group position={effect.position}>
        {/* Main blood pool */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={getEffectSize()} />
          <meshBasicMaterial 
            color={getEffectColor()} 
            transparent 
            opacity={0.8}
          />
        </mesh>
        
        {/* Blood droplets */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh 
            key={i}
            position={[
              (Math.random() - 0.5) * 3,
              0.02,
              (Math.random() - 0.5) * 3
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.2, 0.2]} />
            <meshBasicMaterial 
              color="#8B0000" 
              transparent 
              opacity={0.6}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (effect.type === 'muzzle_flash') {
    return (
      <mesh position={effect.position}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial 
          color={getEffectColor()} 
          transparent 
          opacity={0.8}
        />
      </mesh>
    );
  }

  if (effect.type === 'explosion') {
    return (
      <group position={effect.position}>
        <mesh>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial 
            color="#FF4500" 
            transparent 
            opacity={0.6}
            emissive="#FF4500"
            emissiveIntensity={1}
          />
        </mesh>
        
        {/* Shockwave */}
        <mesh>
          <sphereGeometry args={[4, 16, 16]} />
          <meshBasicMaterial 
            color="#FFFFFF" 
            transparent 
            opacity={0.2}
            wireframe
          />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={effect.position}>
      <sphereGeometry args={getEffectSize()} />
      <meshBasicMaterial 
        color={getEffectColor()} 
        transparent 
        opacity={0.7}
      />
    </mesh>
  );
};

export { CombatSystem };
export type { CombatEffect };