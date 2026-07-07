import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CITY_BUILDINGS } from '../game/cityLayout';

// Procedural sprite textures — canvas-generated at mount so the whole VFX
// layer ships zero binary assets and stays offline-safe.

export function radialTexture(inner: string, size = 64): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, inner);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Thin vertical streak for rain drops (points are screen-aligned, so a
// vertical line reads as falling rain).
function streakTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, 'rgba(180,200,220,0)');
  g.addColorStop(0.5, 'rgba(180,200,220,0.9)');
  g.addColorStop(1, 'rgba(180,200,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(3, 0, 2, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Dark standing-figure silhouette for distant billboard crowds.
function silhouetteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,11,14,0.92)';
  ctx.beginPath();
  ctx.arc(16, 10, 6, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.fillRect(9, 16, 14, 26); // torso
  ctx.fillRect(10, 42, 5, 20); // legs
  ctx.fillRect(17, 42, 5, 20);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Deterministic PRNG so vents/crowds/drones land identically every session
// (same convention as cityLayout).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RAIN_COUNT = 900;
const RAIN_RADIUS = 40;
const RAIN_HEIGHT = 30;

// Sparse neon rain falling in a cylinder that follows the player; drops
// wrap from ground back to the sky so the buffer never reallocates.
const Rain: React.FC<{
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}> = ({ playerPosRef }) => {
  const group = useRef<THREE.Group>(null);
  const geo = useRef<THREE.BufferGeometry>(null);
  const tex = useMemo(() => streakTexture(), []);
  const positions = useMemo(() => {
    const rand = mulberry32(4242);
    const arr = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const ang = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * RAIN_RADIUS;
      arr[i * 3] = Math.cos(ang) * r;
      arr[i * 3 + 1] = rand() * RAIN_HEIGHT;
      arr[i * 3 + 2] = Math.sin(ang) * r;
    }
    return arr;
  }, []);
  const speeds = useMemo(() => {
    const rand = mulberry32(1717);
    const arr = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) arr[i] = 22 + rand() * 14;
    return arr;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const y = i * 3 + 1;
      positions[y] -= speeds[i] * dt;
      if (positions[y] < 0) positions[y] += RAIN_HEIGHT;
    }
    if (geo.current) {
      (geo.current.attributes.position as THREE.BufferAttribute).needsUpdate =
        true;
    }
    // The whole cylinder trails the player so rain never "runs out".
    const p = playerPosRef.current;
    if (group.current) group.current.position.set(p.x, 0, p.z);
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geo}>
          <bufferAttribute
            attach="attributes-position"
            count={RAIN_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={tex}
          color="#9fb4c8"
          size={0.55}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </points>
    </group>
  );
};

const STEAM_PER_VENT = 26;

// One rising, expanding, fading smoke column — classic sprite-cloud steam
// vent. Each puff loops through a life cycle offset from its neighbours.
const SteamVent: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  const geo = useRef<THREE.BufferGeometry>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const tex = useMemo(() => radialTexture('rgba(190,196,205,0.55)'), []);
  const seedRef = useRef(Math.floor(position[0] * 13 + position[2] * 7));
  const life = useMemo(() => {
    const rand = mulberry32(seedRef.current);
    const arr = new Float32Array(STEAM_PER_VENT);
    for (let i = 0; i < STEAM_PER_VENT; i++) arr[i] = rand() * 3;
    return arr;
  }, []);
  const positions = useMemo(() => new Float32Array(STEAM_PER_VENT * 3), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const rand = Math.random;
    for (let i = 0; i < STEAM_PER_VENT; i++) {
      life[i] += dt;
      if (life[i] > 3) {
        life[i] = 0;
        positions[i * 3] = (rand() - 0.5) * 0.4;
        positions[i * 3 + 2] = (rand() - 0.5) * 0.4;
      }
      const t = life[i] / 3;
      positions[i * 3 + 1] = t * 4.5;
      // Slow lateral drift widens the column as it rises.
      positions[i * 3] += (rand() - 0.5) * 0.6 * dt * (1 + t);
      positions[i * 3 + 2] += 0.25 * dt;
    }
    if (geo.current) {
      (geo.current.attributes.position as THREE.BufferAttribute).needsUpdate =
        true;
    }
  });

  return (
    <points position={position} frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute
          attach="attributes-position"
          count={STEAM_PER_VENT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        map={tex}
        color="#aeb4bd"
        size={1.6}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </points>
  );
};

// Distant crowd: cheap camera-facing sprites near building bases, far from
// the play space so they read as street life without needing full models.
const CrowdSprites: React.FC = () => {
  const tex = useMemo(() => silhouetteTexture(), []);
  const figures = useMemo(() => {
    const rand = mulberry32(9001);
    const out: { x: number; z: number; s: number }[] = [];
    for (const b of CITY_BUILDINGS) {
      if (rand() > 0.4) continue;
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        out.push({
          x: b.position[0] + (rand() - 0.5) * (b.size[0] + 6),
          z: b.position[2] + b.size[2] / 2 + 1.5 + rand() * 2,
          s: 0.9 + rand() * 0.25,
        });
      }
    }
    return out;
  }, []);

  return (
    <group>
      {figures.map((f, i) => (
        <sprite key={i} position={[f.x, f.s, f.z]} scale={[f.s, f.s * 2, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
};

// Patrol drones: glowing sprites drifting on slow elliptical paths above
// the streets — cheap moving skyline detail.
const Drones: React.FC = () => {
  const tex = useMemo(() => radialTexture('rgba(255,120,90,0.95)'), []);
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const paths = useMemo(() => {
    const rand = mulberry32(5150);
    return Array.from({ length: 5 }, () => ({
      cx: (rand() - 0.5) * 120,
      cz: (rand() - 0.5) * 120,
      rx: 14 + rand() * 22,
      rz: 10 + rand() * 18,
      y: 18 + rand() * 14,
      speed: 0.08 + rand() * 0.12,
      phase: rand() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    paths.forEach((p, i) => {
      const s = refs.current[i];
      if (!s) return;
      const a = p.phase + t * p.speed * Math.PI * 2;
      s.position.set(
        p.cx + Math.cos(a) * p.rx,
        p.y + Math.sin(t * 0.7 + p.phase) * 1.2,
        p.cz + Math.sin(a) * p.rz
      );
    });
  });

  return (
    <group>
      {paths.map((_, i) => (
        <sprite
          key={i}
          ref={(el) => (refs.current[i] = el)}
          scale={[1.4, 1.4, 1]}
        >
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
};

// Deterministic vent placements pulled off building corners.
const VENTS: [number, number, number][] = (() => {
  const rand = mulberry32(2024);
  const out: [number, number, number][] = [];
  for (const b of CITY_BUILDINGS) {
    if (out.length >= 10) break;
    if (rand() > 0.25) continue;
    out.push([
      b.position[0] + b.size[0] / 2 + 1,
      0.1,
      b.position[2] + (rand() - 0.5) * b.size[2],
    ]);
  }
  return out;
})();

interface AmbientVFXProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

// Sprite-based atmosphere layer: rain streaks, steam vents, distant crowd
// silhouettes, and patrol drones. Everything is procedural (canvas
// textures), deterministic, and ref-driven — no React re-renders per frame.
const AmbientVFX: React.FC<AmbientVFXProps> = ({ playerPosRef }) => (
  <group>
    <Rain playerPosRef={playerPosRef} />
    {VENTS.map((v, i) => (
      <SteamVent key={i} position={v} />
    ))}
    <CrowdSprites />
    <Drones />
  </group>
);

export default AmbientVFX;
