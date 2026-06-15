import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InstantActionProps {
  onAIDemo: () => void;
  onMultiplayerDemo: () => void;
  onCombatDemo: () => void;
}

// Deterministic pseudo-random so the city is identical on every load.
function rand(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100_000) / 100_000;
  };
}

function Skyline() {
  const buildings = useMemo(() => {
    const r = rand(2087);
    const arr: Array<{
      pos: [number, number, number];
      size: [number, number, number];
    }> = [];
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = 14 + r() * 60;
      const w = 2 + r() * 4;
      const h = 6 + r() * 38;
      arr.push({
        pos: [Math.cos(a) * d, h / 2, Math.sin(a) * d],
        size: [w, h, w],
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial
            color="#15171a"
            roughness={0.85}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

function GroundGrid() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a0c" roughness={1} />
      </mesh>
      <gridHelper
        args={[400, 80, '#1d1f23', '#141518']}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

function SignalBeacon() {
  const ref = React.useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (ref.current) {
      const y = 3 + Math.sin(s.clock.elapsedTime * 0.8) * 0.15;
      ref.current.position.y = y;
    }
  });
  return (
    <mesh ref={ref} position={[0, 3, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 6, 12]} />
      <meshStandardMaterial
        color="#c03a30"
        emissive="#c03a30"
        emissiveIntensity={0.9}
      />
    </mesh>
  );
}

function SlowOrbit() {
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.06;
    s.camera.position.set(Math.sin(t) * 60, 28, Math.cos(t) * 60);
    s.camera.lookAt(0, 6, 0);
  });
  return null;
}

const PANEL = 'border border-[#222428] bg-black/55 backdrop-blur-sm';
const LABEL = 'text-[10px] tracking-[0.32em] uppercase text-neutral-500';

const InstantAction: React.FC<InstantActionProps> = ({
  onAIDemo,
  onMultiplayerDemo,
  onCombatDemo,
}) => {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: '#0b0b0c',
        color: '#e6e6e6',
        fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [60, 28, 60], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0b0b0c']} />
        <fog attach="fog" args={['#0b0b0c', 60, 180]} />
        <ambientLight intensity={0.18} />
        <directionalLight
          position={[40, 60, 20]}
          intensity={0.55}
          color="#cccfd4"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight
          position={[-30, 30, -40]}
          intensity={0.18}
          color="#c03a30"
        />
        <SlowOrbit />
        <GroundGrid />
        <Skyline />
        <SignalBeacon />
      </Canvas>

      {/* Top status rail */}
      <div className="absolute inset-x-0 top-0 flex items-baseline justify-between px-10 pt-6 font-mono text-[11px] tracking-[0.32em] uppercase pointer-events-none">
        <span className="text-neutral-500">
          ironhaven · live demo · build 2087
        </span>
        <span className="text-neutral-500">
          node <span className="text-neutral-200">eu-west-3</span> · ping{' '}
          <span className="text-neutral-200">38ms</span> ·{' '}
          <span style={{ color: '#7dd97d' }}>online</span>
        </span>
      </div>

      {/* Left wordmark */}
      <div className="absolute left-10 bottom-32 max-w-[640px]">
        <div
          className="text-[11px] tracking-[0.4em] uppercase mb-4"
          style={{ color: '#8a3b34' }}
        >
          district 01 · north spine
        </div>
        <h1
          className="font-bold leading-[0.85] tracking-[-0.04em]"
          style={{ fontSize: 'clamp(64px, 9vw, 144px)' }}
        >
          A city that
          <br />
          plays <span style={{ color: '#c03a30' }}>back</span>.
        </h1>
        <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-neutral-400 font-mono">
          50+ AI-directed factions. Persistent presence on a shared world
          server. Pick a path below — every demo loads the same authoritative
          simulation.
        </p>
      </div>

      {/* Action menu */}
      <div className="absolute right-10 bottom-10 w-[320px]">
        <div className={`${LABEL} mb-3`}>00 — entry points</div>
        <div className="divide-y divide-[#1a1c1f]">
          {(
            [
              {
                id: 'ai',
                label: 'Walk into a conversation',
                sub: 'AI · director · NPCs',
                on: onAIDemo,
              },
              {
                id: 'mp',
                label: 'Join the live world',
                sub: 'Multiplayer · 24/7 shard',
                on: onMultiplayerDemo,
              },
              {
                id: 'cb',
                label: 'Pick a fight',
                sub: 'Combat · ballistics · cover',
                on: onCombatDemo,
              },
            ] as const
          ).map((opt, i) => (
            <button
              key={opt.id}
              onClick={opt.on}
              onMouseEnter={() => setHover(opt.id)}
              onMouseLeave={() => setHover(null)}
              className={`${PANEL} w-full text-left px-5 py-4 flex items-center justify-between transition-colors`}
              style={{
                borderColor: hover === opt.id ? '#c03a30' : '#222428',
                marginTop: i === 0 ? 0 : -1,
              }}
            >
              <span>
                <span className="block text-[15px] tracking-tight">
                  {opt.label}
                </span>
                <span className="block mt-1 text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-mono">
                  {opt.sub}
                </span>
              </span>
              <span
                className="font-mono text-[14px]"
                style={{ color: hover === opt.id ? '#c03a30' : '#5a5d62' }}
              >
                →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Corner ticks */}
      <div className="pointer-events-none absolute inset-0">
        {[
          'top-6 left-6 border-t border-l',
          'top-6 right-6 border-t border-r',
          'bottom-6 left-6 border-b border-l',
          'bottom-6 right-6 border-b border-r',
        ].map((c) => (
          <div
            key={c}
            className={`absolute w-6 h-6 ${c}`}
            style={{ borderColor: '#3a3a3e' }}
          />
        ))}
      </div>
    </div>
  );
};

export default InstantAction;
