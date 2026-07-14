import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
    }> = [];
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI * 2;
      const d = 12 + r() * 70;
      const w = 1.8 + r() * 5;
      const h = 8 + r() * 42;
      arr.push({
        pos: [Math.cos(a) * d, h / 2, Math.sin(a) * d],
        size: [w, h, w],
        neon: r() > 0.78,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial
            color={b.neon ? '#1a1214' : '#121416'}
            roughness={0.88}
            metalness={0.12}
            emissive={b.neon ? '#c03a30' : '#000000'}
            emissiveIntensity={b.neon ? 0.22 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#08080a" roughness={1} />
      </mesh>
      <gridHelper args={[400, 90, '#1c1e22', '#121316']} position={[0, 0.02, 0]} />
    </>
  );
}

function Beacon() {
  const ref = React.useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 4 + Math.sin(s.clock.elapsedTime * 0.9) * 0.2;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.7 + Math.sin(s.clock.elapsedTime * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, 4, 0]}>
      <cylinderGeometry args={[0.35, 0.45, 7, 10]} />
      <meshStandardMaterial
        color="#c03a30"
        emissive="#c03a30"
        emissiveIntensity={0.85}
      />
    </mesh>
  );
}

function CineCam({ intensity }: { intensity: number }) {
  useFrame((s) => {
    const t = s.clock.elapsedTime * (0.05 + intensity * 0.04);
    const r = 48 - intensity * 12;
    const y = 22 + Math.sin(t * 0.7) * 3 + intensity * 4;
    s.camera.position.set(Math.sin(t) * r, y, Math.cos(t) * r);
    s.camera.lookAt(0, 4 + intensity * 2, 0);
  });
  return null;
}

/**
 * Full-bleed 3D city under letterboxed story beats — first narrative hit
 * after cold boot, before the district menu.
 */
const OpeningCinematic: React.FC<OpeningCinematicProps> = ({ onComplete }) => {
  const [done, setDone] = useState(false);
  // Slight push-in over the sequence feels more cinematic.
  const [camPush] = useState(0.35);

  if (done) return null;

  return (
    <div className="fixed inset-0 bg-[#050507]">
      <Canvas
        shadows
        camera={{ position: [50, 24, 50], fov: 40 }}
        gl={{ antialias: true, alpha: false }}
        className="!absolute inset-0"
      >
        <color attach="background" args={['#08080a']} />
        <fog attach="fog" args={['#08080a', 40, 140]} />
        <ambientLight intensity={0.14} />
        <directionalLight
          position={[40, 55, 20]}
          intensity={0.5}
          color="#c8cbd0"
          castShadow
        />
        <directionalLight
          position={[-25, 20, -30]}
          intensity={0.22}
          color="#c03a30"
        />
        <CineCam intensity={camPush} />
        <Ground />
        <CinematicCity />
        <Beacon />
      </Canvas>

      {/* Soft vignette over 3D so text stays legible */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
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
