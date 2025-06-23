import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  type: 'smoke' | 'fire' | 'spark' | 'blood' | 'debris';
}

interface ParticleSystemProps {
  effects: {
    id: string;
    type: 'explosion' | 'gunfire' | 'impact' | 'vehicle_exhaust' | 'blood_spatter';
    position: [number, number, number];
    intensity: number;
  }[];
  onEffectComplete: (id: string) => void;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ effects, onEffectComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Create particles for each effect
  useEffect(() => {
    effects.forEach(effect => {
      const newParticles = generateParticlesForEffect(effect);
      setParticles(prev => [...prev, ...newParticles]);
      
      // Schedule effect completion
      setTimeout(() => {
        onEffectComplete(effect.id);
      }, getEffectDuration(effect.type));
    });
  }, [effects]);

  const generateParticlesForEffect = (effect: any): Particle[] => {
    const particles: Particle[] = [];
    const basePosition = new THREE.Vector3(...effect.position);
    
    switch (effect.type) {
      case 'explosion':
        // Fire particles
        for (let i = 0; i < 20 * effect.intensity; i++) {
          particles.push({
            id: `fire_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 15,
              Math.random() * 20 + 5,
              (Math.random() - 0.5) * 15
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 1.5 + 0.5,
            color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 1, 0.5),
            type: 'fire'
          });
        }
        
        // Smoke particles
        for (let i = 0; i < 15 * effect.intensity; i++) {
          particles.push({
            id: `smoke_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 3,
              Math.random() * 3,
              (Math.random() - 0.5) * 3
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 5,
              Math.random() * 8 + 2,
              (Math.random() - 0.5) * 5
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 2 + 1,
            color: new THREE.Color(0.2, 0.2, 0.2),
            type: 'smoke'
          });
        }
        break;

      case 'gunfire':
        // Muzzle flash sparks
        for (let i = 0; i < 10 * effect.intensity; i++) {
          particles.push({
            id: `spark_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 0.5,
              (Math.random() - 0.5) * 0.5,
              (Math.random() - 0.5) * 0.5
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 0.3 + 0.1,
            color: new THREE.Color(1, 0.8, 0.2),
            type: 'spark'
          });
        }
        
        // Gun smoke
        for (let i = 0; i < 5 * effect.intensity; i++) {
          particles.push({
            id: `gunsmoke_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 1,
              Math.random() * 1,
              (Math.random() - 0.5) * 1
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 3 + 1,
              (Math.random() - 0.5) * 2
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 0.8 + 0.3,
            color: new THREE.Color(0.6, 0.6, 0.6),
            type: 'smoke'
          });
        }
        break;

      case 'blood_spatter':
        // Blood droplets
        for (let i = 0; i < 15 * effect.intensity; i++) {
          particles.push({
            id: `blood_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 6,
              Math.random() * 4 + 1,
              (Math.random() - 0.5) * 6
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 0.4 + 0.2,
            color: new THREE.Color(0.5, 0, 0),
            type: 'blood'
          });
        }
        break;

      case 'vehicle_exhaust':
        // Exhaust smoke
        for (let i = 0; i < 8 * effect.intensity; i++) {
          particles.push({
            id: `exhaust_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 0.5,
              Math.random() * 0.5,
              (Math.random() - 0.5) * 0.5
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 1,
              Math.random() * 2 + 0.5,
              Math.random() * 3 + 1
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 1 + 0.5,
            color: new THREE.Color(0.1, 0.1, 0.1),
            type: 'smoke'
          });
        }
        break;

      case 'impact':
        // Debris particles
        for (let i = 0; i < 12 * effect.intensity; i++) {
          particles.push({
            id: `debris_${Date.now()}_${i}`,
            position: basePosition.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 1,
              Math.random() * 1,
              (Math.random() - 0.5) * 1
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              Math.random() * 8 + 2,
              (Math.random() - 0.5) * 10
            ),
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 0.3 + 0.1,
            color: new THREE.Color(0.6, 0.6, 0.4),
            type: 'debris'
          });
        }
        break;
    }
    
    return particles;
  };

  const getEffectDuration = (type: string): number => {
    switch (type) {
      case 'explosion': return 3000;
      case 'gunfire': return 500;
      case 'blood_spatter': return 2000;
      case 'vehicle_exhaust': return 1000;
      case 'impact': return 1500;
      default: return 1000;
    }
  };

  // Update particles
  useFrame((state, delta) => {
    setParticles(prev => {
      return prev
        .map(particle => {
          // Update particle properties
          const newLife = particle.life - delta * 2; // Particles last about 0.5 seconds
          
          if (newLife <= 0) return null;

          // Update position
          particle.position.add(particle.velocity.clone().multiplyScalar(delta));
          
          // Apply gravity for some particle types
          if (particle.type === 'blood' || particle.type === 'debris') {
            particle.velocity.y -= 9.8 * delta; // Gravity
          }
          
          // Apply air resistance
          particle.velocity.multiplyScalar(0.98);
          
          // Fade particles over time
          const alpha = newLife / particle.maxLife;
          
          return {
            ...particle,
            life: newLife,
            color: particle.color.clone().multiplyScalar(alpha)
          };
        })
        .filter((particle): particle is Particle => particle !== null);
    });
  });

  // Create instanced mesh for all particles
  const particleGeometry = useMemo(() => new THREE.SphereGeometry(0.1, 8, 8), []);
  const particleMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  }), []);

  return (
    <group>
      {particles.map(particle => (
        <mesh
          key={particle.id}
          position={particle.position}
          scale={[particle.size, particle.size, particle.size]}
        >
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={particle.life / particle.maxLife}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

export default ParticleSystem;