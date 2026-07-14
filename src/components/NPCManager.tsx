import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CharacterModel from './CharacterModel';
import { radialTexture } from './AmbientVFX';
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

export type AttackFn = (damage: number, range?: number) => void;

export interface NpcBlip {
  x: number;
  z: number;
  hostile: boolean;
  type: string;
}

interface NPCManagerProps {
  count?: number;
  seed?: number;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  onNearest: (npc: Npc | null) => void;
  attackApi: React.MutableRefObject<AttackFn | null>;
  /** Live minimap blips — written every frame, no React re-renders. */
  blipsRef?: React.MutableRefObject<NpcBlip[]>;
}

const NPCManager: React.FC<NPCManagerProps> = ({
  count = 24,
  seed = 1337,
  playerPosRef,
  onNearest,
  attackApi,
  blipsRef,
}) => {
  const npcs = useMemo(() => createNpcs(count, seed), [count, seed]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const moodLights = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const fills = useRef<(THREE.Mesh | null)[]>([]);
  const bars = useRef<(THREE.Group | null)[]>([]);
  const lastNearest = useRef<string | null>(null);
  // Per-NPC animation speed feeds (plain refs, no re-renders).
  const speedRefs = useMemo(() => npcs.map(() => ({ current: 0 })), [npcs]);
  const prevPos = useMemo(() => npcs.map((n) => ({ x: n.x, z: n.z })), [npcs]);

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
  // Soft radial sprite so splatter points render as round droplets.
  const splatterTex = useMemo(() => radialTexture('rgba(255,90,70,1)'), []);

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
          // Also bumps totalKills + awards npc_kill XP.
          s.incrementPoliceKillCount();
        } else {
          useGameStore.setState((st) => ({
            sessionStats: {
              ...st.sessionStats,
              totalKills: st.sessionStats.totalKills + 1,
            },
          }));
          const xpAmt =
            e.npc.type === 'boss'
              ? 90
              : e.npc.type === 'hitman'
                ? 60
                : e.npc.type === 'gangster'
                  ? 40
                  : 28;
          s.gainXp('npc_kill', xpAmt);
          if (e.npc.type === 'civilian') wanted += 1;
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
    attackApi.current = (damage: number, range?: number) => {
      const p = playerPosRef.current;
      const reach = range && range > 0 ? range : MELEE_RANGE;
      let target: Npc | null = null;
      // Slight grace beyond weapon range so hits feel fair at the edge.
      let bestSq = reach * reach * 1.15;
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
      const dead = npc.mood === 'dead';
      if (g) {
        g.position.set(npc.x, dead ? 0.3 : 1, npc.z);
        g.rotation.y = npc.rotation;
        // Collapse to a fallen silhouette on death.
        g.rotation.x = dead ? Math.PI / 2 : 0;
      }
      const light = moodLights.current[i];
      if (light) light.color.set(npcColor(npc));

      // Ground speed for the walk/run animation blender.
      const pdx = npc.x - prevPos[i].x;
      const pdz = npc.z - prevPos[i].z;
      prevPos[i].x = npc.x;
      prevPos[i].z = npc.z;
      const instant = dead ? 0 : Math.sqrt(pdx * pdx + pdz * pdz) / dt;
      speedRefs[i].current += (instant - speedRefs[i].current) * 0.2;

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

    // Feed the HUD minimap without scheduling React renders.
    if (blipsRef) {
      const blips: NpcBlip[] = [];
      for (const npc of npcs) {
        if (npc.mood === 'dead') continue;
        blips.push({
          x: npc.x,
          z: npc.z,
          hostile: npc.mood === 'hostile',
          type: npc.type,
        });
      }
      blipsRef.current = blips;
    }

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
          {/* Rigged animated character (shared GLTF, skeleton-cloned). */}
          <group position={[0, -1, 0]} rotation={[0, Math.PI, 0]}>
            <CharacterModel
              speedRef={speedRefs[i]}
              tint={npc.type === 'police' ? '#7d94b8' : '#b9a98f'}
            />
          </group>
          {/* Mood indicator — small marker over the head whose color
              tracks calm/alert/hostile/fleeing/dead state. */}
          <mesh position={[0, 1.15, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial
              ref={(el) =>
                (moodLights.current[i] = el as THREE.MeshBasicMaterial)
              }
              color={npcColor(npc)}
            />
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
          map={splatterTex}
          color="#c03a30"
          size={0.3}
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
