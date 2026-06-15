import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameState';
import {
  Npc,
  NpcEvent,
  createNpcs,
  damageNpc,
  npcColor,
  tickNpc,
  TALK_RANGE,
  MELEE_RANGE,
} from '../game/npc';

interface NPCManagerProps {
  count?: number;
  seed?: number;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  onNearest: (npc: Npc | null) => void;
  attackApi: React.MutableRefObject<((damage: number) => void) | null>;
}

const NPCManager: React.FC<NPCManagerProps> = ({
  count = 24,
  seed = 1337,
  playerPosRef,
  onNearest,
  attackApi,
}) => {
  const npcs = useMemo(() => createNpcs(count, seed), [count, seed]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const bodies = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const fills = useRef<(THREE.Mesh | null)[]>([]);
  const bars = useRef<(THREE.Group | null)[]>([]);
  const lastNearest = useRef<string | null>(null);

  // Ink-splatter burst pool — a single Points cloud mutated in-place per frame.
  const PARTICLE_COUNT = 300;
  const particlePos = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) arr[i * 3 + 1] = -9999; // park off-screen
    return arr;
  }, []);
  const particleVel = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const particleLife = useRef(new Float32Array(PARTICLE_COUNT));
  const particleGeo = useRef<THREE.BufferGeometry>(null);
  const nextParticle = useRef(0);

  // Escalating feedback: a routine hit pops a small splatter, but a kill erupts
  // — more ink, faster, longer-lived — so finishing a target reads as a
  // distinct, high-impact payoff rather than just another hit.
  const spawnBurst = (
    x: number,
    y: number,
    z: number,
    count = 14,
    speedScale = 1
  ) => {
    const pos = particlePos;
    const vel = particleVel.current;
    const life = particleLife.current;
    for (let k = 0; k < count; k++) {
      const idx = nextParticle.current % PARTICLE_COUNT;
      nextParticle.current++;
      const o = idx * 3;
      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = z;
      const ang = Math.random() * Math.PI * 2;
      const sp = (1.5 + Math.random() * 4.5) * speedScale;
      vel[o] = Math.cos(ang) * sp;
      vel[o + 1] = (2.5 + Math.random() * 4) * speedScale;
      vel[o + 2] = Math.sin(ang) * sp;
      life[idx] = (0.5 + Math.random() * 0.35) * (speedScale > 1 ? 1.3 : 1);
    }
  };

  const applyEvents = (events: NpcEvent[]) => {
    if (events.length === 0) return;
    const s = useGameStore.getState();
    let rep = 0;
    let money = 0;
    let wanted = 0;
    let dmg = 0;
    for (const e of events) {
      if (e.kind === 'damage') {
        dmg += e.amount || 0;
      } else if (e.kind === 'kill' && e.npc) {
        rep += e.rep || 0;
        money += e.money || 0;
        if (e.npc.type === 'police') {
          wanted += 2;
          s.incrementPoliceKillCount();
        } else if (e.npc.type === 'civilian') {
          wanted += 1;
        }
        s.addAction(`killed_${e.npc.type}`);
      }
    }
    const ps = useGameStore.getState().playerStats;
    s.updateStats({
      health: Math.max(0, ps.health - dmg),
      reputation: ps.reputation + rep,
      money: ps.money + money,
      wanted: Math.min(5, ps.wanted + wanted),
    });
  };

  useEffect(() => {
    attackApi.current = (damage: number) => {
      const p = playerPosRef.current;
      let target: Npc | null = null;
      let bestSq = MELEE_RANGE * MELEE_RANGE * 2.2;
      for (const npc of npcs) {
        if (npc.mood === 'dead') continue;
        const dx = npc.x - p.x;
        const dz = npc.z - p.z;
        const d = dx * dx + dz * dz;
        if (d < bestSq) {
          bestSq = d;
          target = npc;
        }
      }
      if (target) {
        const events: NpcEvent[] = [];
        damageNpc(target, damage, events);
        const killed = events.some((e) => e.kind === 'kill');
        // Kill → big, fast eruption; hit → small splatter.
        if (killed) spawnBurst(target.x, 1.1, target.z, 34, 1.7);
        else spawnBurst(target.x, 1.1, target.z, 14, 1);
        applyEvents(events);
      }
    };
    return () => {
      attackApi.current = null;
    };
  }, [npcs, playerPosRef, attackApi]);

  useFrame((_, delta) => {
    const p = playerPosRef.current;
    const ps = useGameStore.getState().playerStats;
    const snap = {
      x: p.x,
      z: p.z,
      wanted: ps.wanted,
      reputation: ps.reputation,
      kills: ps.policeKillCount,
    };
    const dt = Math.min(delta, 0.05);
    const events: NpcEvent[] = [];
    let nearest: Npc | null = null;
    let nearestSq = TALK_RANGE * TALK_RANGE;

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      tickNpc(npc, snap, dt, events, npcs);

      const g = groups.current[i];
      if (g) {
        const dead = npc.mood === 'dead';
        g.position.set(npc.x, dead ? 0.3 : 1, npc.z);
        g.rotation.y = npc.rotation;
        // Collapse to a fallen silhouette on death.
        g.rotation.x = dead ? Math.PI / 2 : 0;
      }
      const mat = bodies.current[i];
      if (mat) mat.color.set(npcColor(npc));

      const frac = npc.health / npc.maxHealth;
      const bar = bars.current[i];
      const fill = fills.current[i];
      if (bar) bar.visible = npc.mood !== 'dead' && frac < 1;
      if (fill) {
        fill.scale.x = Math.max(0.001, frac);
        fill.position.x = -(1.2 * (1 - frac)) / 2;
      }

      if (npc.mood !== 'dead') {
        const dx = npc.x - p.x;
        const dz = npc.z - p.z;
        const d = dx * dx + dz * dz;
        if (d < nearestSq) {
          nearestSq = d;
          nearest = npc;
        }
      }
    }

    applyEvents(events);

    // Advance the ink-splatter pool — gravity, integrate, retire expired points.
    const pos = particlePos;
    const vel = particleVel.current;
    const life = particleLife.current;
    for (let k = 0; k < PARTICLE_COUNT; k++) {
      if (life[k] <= 0) continue;
      life[k] -= dt;
      const o = k * 3;
      vel[o + 1] -= 12 * dt;
      pos[o] += vel[o] * dt;
      pos[o + 1] += vel[o + 1] * dt;
      pos[o + 2] += vel[o + 2] * dt;
      if (life[k] <= 0) pos[o + 1] = -9999;
    }
    const geo = particleGeo.current;
    if (geo)
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const nearestId = nearest ? nearest.id : null;
    if (nearestId !== lastNearest.current) {
      lastNearest.current = nearestId;
      onNearest(nearest);
    }
  });

  return (
    <group>
      {npcs.map((npc, i) => (
        <group
          key={npc.id}
          ref={(el) => (groups.current[i] = el)}
          position={[npc.x, 1, npc.z]}
        >
          {/* Legs */}
          <mesh castShadow position={[-0.13, -0.6, 0]}>
            <boxGeometry args={[0.16, 0.8, 0.18]} />
            <meshStandardMaterial
              color="#2a2c30"
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
          <mesh castShadow position={[0.13, -0.6, 0]}>
            <boxGeometry args={[0.16, 0.8, 0.18]} />
            <meshStandardMaterial
              color="#2a2c30"
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
          {/* Pelvis */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[0.46, 0.26, 0.26]} />
            <meshStandardMaterial
              color="#222428"
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
          {/* Torso — the mood-colored mass */}
          <mesh castShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[0.5, 0.7, 0.28]} />
            <meshStandardMaterial
              ref={(el) =>
                (bodies.current[i] = el as THREE.MeshStandardMaterial)
              }
              color={npcColor(npc)}
              roughness={0.8}
              metalness={0.05}
            />
          </mesh>
          {/* Faction band — restrained red accent */}
          <mesh position={[0, 0.52, 0.145]}>
            <boxGeometry args={[0.52, 0.1, 0.04]} />
            <meshStandardMaterial
              color="#c03a30"
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
          {/* Arms */}
          <mesh castShadow position={[-0.33, 0.32, 0]}>
            <boxGeometry args={[0.14, 0.66, 0.16]} />
            <meshStandardMaterial
              color="#2a2c30"
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
          <mesh castShadow position={[0.33, 0.32, 0]}>
            <boxGeometry args={[0.14, 0.66, 0.16]} />
            <meshStandardMaterial
              color="#2a2c30"
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.32, 0.34, 0.3]} />
            <meshStandardMaterial color="#b8b8bc" roughness={0.85} />
          </mesh>
          <group
            ref={(el) => (bars.current[i] = el)}
            position={[0, 1.45, 0]}
            visible={false}
          >
            <mesh>
              <planeGeometry args={[1.2, 0.12]} />
              <meshBasicMaterial color="#1a1c1f" />
            </mesh>
            <mesh ref={(el) => (fills.current[i] = el)} position={[0, 0, 0.01]}>
              <planeGeometry args={[1.2, 0.1]} />
              <meshBasicMaterial color="#c03a30" />
            </mesh>
          </group>
        </group>
      ))}

      {/* Ink-splatter burst cloud — ref-driven, shared across all hits. */}
      <points frustumCulled={false}>
        <bufferGeometry ref={particleGeo}>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particlePos}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#c03a30"
          size={0.22}
          sizeAttenuation
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </points>
    </group>
  );
};

export default NPCManager;
