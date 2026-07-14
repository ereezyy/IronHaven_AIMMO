import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { KernelSize, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import CutscenePlayer from './CutscenePlayer';
import { OPENING_CUTSCENE } from '../game/cutscenes';

interface OpeningCinematicProps {
  onComplete: () => void;
}

function rand(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100_000) / 100_000;
  };
}

function CinematicCity() {
  const buildings = useMemo(() => {
    const r = rand(2087);
    const arr: Array<{
      pos: [number, number, number];
      size: [number, number, number];
      neon: boolean;
      neonColor: string;
    }> = [];
    for (let i = 0; i < 140; i++) {
      const a = r() * Math.PI * 2;
      const d = 10 + r() * 85;
      const w = 2.2 + r() * 6.5;
      const h = 9 + r() * 55;
      const neon = r() > 0.65;
      const neonColor = ['#c03a30', '#00d4ff', '#ff2e88'][Math.floor(r() * 3)];
      arr.push({
        pos: [Math.cos(a) * d, h / 2, Math.sin(a) * d],
        size: [w, h, w],
        neon,
        neonColor,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* Main building body */}
          <mesh castShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color={b.neon ? '#0f0f12' : '#111316'}
              roughness={0.82}
              metalness={0.18}
              emissive={b.neon ? b.neonColor : '#000000'}
              emissiveIntensity={b.neon ? 0.35 : 0}
            />
          </mesh>

          {/* Bright neon ledges / strips */}
          {b.neon && (
            <>
              <mesh position={[0, b.size[1] * 0.38, b.size[2] / 2 + 0.06]}>
                <boxGeometry args={[b.size[0] * 1.04, 0.65, 0.14]} />
                <meshStandardMaterial
                  color={b.neonColor}
                  emissive={b.neonColor}
                  emissiveIntensity={1.15}
                />
              </mesh>
              <mesh position={[0, -b.size[1] * 0.26, b.size[2] / 2 + 0.06]}>
                <boxGeometry args={[b.size[0] * 1.04, 0.5, 0.11]} />
                <meshStandardMaterial
                  color={b.neonColor}
                  emissive={b.neonColor}
                  emissiveIntensity={0.95}
                />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[520, 520]} />
        <meshStandardMaterial color="#050507" roughness={0.95} />
      </mesh>
      <gridHelper
        args={[520, 120, '#15171b', '#0c0c0f']}
        position={[0, 0.03, 0]}
      />
    </>
  );
}

function Beacon() {
  const ref = React.useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 4.5 + Math.sin(s.clock.elapsedTime * 0.85) * 0.25;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.0 + Math.sin(s.clock.elapsedTime * 1.8) * 0.4;
  });
  return (
    <mesh ref={ref} position={[0, 4.5, 0]}>
      <cylinderGeometry args={[0.38, 0.52, 9, 12]} />
      <meshStandardMaterial
        color="#c03a30"
        emissive="#c03a30"
        emissiveIntensity={1.1}
      />
    </mesh>
  );
}

// Animated rain
function Rain() {
  const count = 320;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      arr[i] = (Math.random() - 0.5) * 190;
      arr[i + 1] = 28 + Math.random() * 62;
      arr[i + 2] = (Math.random() - 0.5) * 190;
    }
    return arr;
  }, []);

  const ref = React.useRef<THREE.Points>(null!);

  useFrame((state) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 1; i < pos.count * 3; i += 3) {
      pos.array[i] -=
        42 * state.clock.getDelta() * (0.65 + Math.random() * 0.7);
      if (pos.array[i] < 0.3) {
        pos.array[i] = 32 + Math.random() * 52;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.11}
        color="#aaccff"
        transparent
        opacity={0.38}
        sizeAttenuation
      />
    </points>
  );
}

// Flying drones / vehicles
function FlyingTraffic() {
  const vehicles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      radius: 22 + Math.random() * 62,
      height: 13 + Math.random() * 32,
      speed: 0.075 + Math.random() * 0.11,
      phase: Math.random() * Math.PI * 2,
      size: 1.4 + Math.random() * 1.6,
    }));
  }, []);

  return (
    <group>
      {vehicles.map((v) => (
        <Vehicle key={v.id} {...v} />
      ))}
    </group>
  );
}

function Vehicle({ radius, height, speed, phase, size }: any) {
  const ref = React.useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime * speed + phase;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius * 0.88;
    ref.current.position.set(x, height, z);
    ref.current.rotation.y = t + Math.PI / 2;
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[size * 2.4, size * 0.55, size * 0.95]} />
        <meshStandardMaterial
          color="#1c2127"
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, size * 0.32, 0]}>
        <boxGeometry args={[size * 1.15, size * 0.32, size * 0.65]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.85}
        />
      </mesh>
    </group>
  );
}

function CineCam({ intensity }: { intensity: number }) {
  useFrame((s) => {
    const t = s.clock.elapsedTime * (0.038 + intensity * 0.026);
    const r = 58 - intensity * 16;
    const y = 27 + Math.sin(t * 0.52) * 4.5 + intensity * 3.5;
    s.camera.position.set(Math.sin(t) * r, y, Math.cos(t) * r * 0.9);
    s.camera.lookAt(0, 5 + intensity * 1.8, 0);
  });
  return null;
}

/**
 * Full-bleed 3D city under letterboxed story beats — first narrative hit
 * after cold boot, before the district menu.
 */
const OpeningCinematic: React.FC<OpeningCinematicProps> = ({ onComplete }) => {
  const [done, setDone] = useState(false);
  const [camPush] = useState(0.32);

  if (done) return null;

  return (
    <div className="fixed inset-0 bg-[#050507]">
      <Canvas
        shadows
        camera={{ position: [52, 26, 52], fov: 38 }}
        gl={{ antialias: true, alpha: false }}
        className="!absolute inset-0"
      >
        <color attach="background" args={['#050507']} />
        <fog attach="fog" args={['#050507', 48, 165]} />

        <ambientLight intensity={0.12} />
        <directionalLight
          position={[42, 58, 22]}
          intensity={0.55}
          color="#c8cbd0"
          castShadow
        />
        <directionalLight
          position={[-28, 18, -32]}
          intensity={0.28}
          color="#c03a30"
        />
        <pointLight position={[0, 32, -18]} intensity={0.6} color="#00d4ff" />
        <pointLight position={[-35, 18, 28]} intensity={0.5} color="#ff2e88" />

        <CineCam intensity={camPush} />

        <Ground />
        <CinematicCity />
        <Beacon />
        <Rain />
        <FlyingTraffic />

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={1.05}
            luminanceThreshold={0.18}
            luminanceSmoothing={0.85}
            mipmapBlur
            radius={0.85}
            kernelSize={KernelSize.LARGE}
          />
          <Noise premultiply blendFunction={BlendFunction.SCREEN} />
          <Vignette offset={0.22} darkness={0.68} eskil={false} />
        </EffectComposer>
      </Canvas>

      {/* Atmospheric vignette + image overlay for extra depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 18%, rgba(0,0,0,0.48) 68%, rgba(0,0,0,0.82) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-screen"
        style={{
          backgroundImage: `url(/assets/ironhaven_city_intro.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'contrast(1.1) saturate(0.85)',
        }}
      />

      <CutscenePlayer
        script={OPENING_CUTSCENE}
        onComplete={() => {
          setDone(true);
          onComplete();
        }}
        zIndex={20}
      />
    </div>
  );
};

export default OpeningCinematic;
