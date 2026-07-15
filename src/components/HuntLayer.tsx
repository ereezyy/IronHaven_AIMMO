import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  createPreyHerd,
  tickPrey,
  damagePrey,
  PREY,
  HUNT_MELEE_RANGE,
  type PreyRuntime,
  type PreyEvent,
} from '../game/hunting';
import { isSafeZoneAt, isSpawnProtected } from '../game/zones';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';

export type HuntAttackFn = (damage: number, range?: number) => boolean;

interface HuntLayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  huntAttackApi: React.MutableRefObject<HuntAttackFn | null>;
}

const HuntLayer: React.FC<HuntLayerProps> = ({
  playerPosRef,
  huntAttackApi,
}) => {
  const herd = useMemo(() => createPreyHerd(20), []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const registerHuntKill = useGameStore((s) => s.registerHuntKill);

  useFrame((_, delta) => {
    const p = playerPosRef.current;
    const alive = useGameStore.getState().playerStats.health > 0;
    const dt = Math.min(delta, 0.05);
    const now = Date.now();
    const events: PreyEvent[] = [];

    for (let i = 0; i < herd.length; i++) {
      const prey = herd[i];
      tickPrey(prey, { x: p.x, z: p.z, alive }, dt, now, events);
      const g = groups.current[i];
      const def = PREY[prey.defId];
      if (g) {
        g.position.set(prey.x, prey.mood === 'dead' ? 0.15 : 0.45, prey.z);
        g.rotation.y = prey.rotation;
        g.scale.setScalar(def.scale * (prey.mood === 'dead' ? 0.7 : 1));
        g.visible = prey.mood !== 'dead' || now < prey.respawnAt - 40000;
      }
    }

    if (events.length === 0) return;
    let dmg = 0;
    for (const e of events) {
      if (e.kind === 'damage_player') dmg += e.amount || 0;
      if (e.kind === 'prey_kill') {
        const s = useGameStore.getState();
        s.updateStats({
          money: s.playerStats.money + (e.money || 0),
        });
        s.gainXp('hunt', e.xp);
        registerHuntKill();
        gameAudio.play('kill', 0.35);
        s.addAction(`hunt_${e.preyId}`);
      }
    }
    if (dmg > 0 && !isSafeZoneAt(p.x, p.z) && !isSpawnProtected()) {
      const s = useGameStore.getState();
      s.updateStats({
        health: Math.max(0, s.playerStats.health - dmg),
      });
      gameAudio.play('hit', 0.3);
    }
  });

  React.useEffect(() => {
    huntAttackApi.current = (damage, range) => {
      const reach = range && range > 0 ? range : HUNT_MELEE_RANGE;
      const p = playerPosRef.current;
      let hit = false;
      const now = Date.now();
      const events: PreyEvent[] = [];
      let best: PreyRuntime | null = null;
      let bestSq = reach * reach * 1.2;
      for (const prey of herd) {
        if (prey.mood === 'dead') continue;
        const dx = prey.x - p.x;
        const dz = prey.z - p.z;
        const d = dx * dx + dz * dz;
        if (d < bestSq) {
          bestSq = d;
          best = prey;
        }
      }
      if (best) {
        damagePrey(best, damage, now, events);
        hit = true;
        for (const e of events) {
          if (e.kind === 'prey_kill') {
            const s = useGameStore.getState();
            s.updateStats({ money: s.playerStats.money + (e.money || 0) });
            s.gainXp('hunt', e.xp);
            registerHuntKill();
            gameAudio.play('kill', 0.4);
          }
        }
      }
      return hit;
    };
    return () => {
      huntAttackApi.current = null;
    };
  }, [herd, huntAttackApi, playerPosRef, registerHuntKill]);

  return (
    <group>
      {herd.map((prey, i) => {
        const def = PREY[prey.defId];
        return (
          <group
            key={prey.id}
            ref={(el) => {
              groups.current[i] = el;
            }}
            position={[prey.x, 0.45, prey.z]}
          >
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.55, 1.1]} />
              <meshStandardMaterial
                color={def.color}
                emissive={def.color}
                emissiveIntensity={prey.hitFlash > 0 ? 1.5 : 0.15}
                metalness={0.35}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[0, 0.35, 0.45]}>
              <boxGeometry args={[0.35, 0.3, 0.35]} />
              <meshStandardMaterial color={def.color} />
            </mesh>
            {prey.mood !== 'dead' && prey.health < def.maxHealth && (
              <Html center position={[0, 1.1, 0]} distanceFactor={12}>
                <div
                  style={{
                    width: 48,
                    height: 3,
                    background: '#111',
                    border: '1px solid #333',
                  }}
                >
                  <div
                    style={{
                      width: `${(prey.health / def.maxHealth) * 100}%`,
                      height: '100%',
                      background: '#c9a15a',
                    }}
                  />
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default HuntLayer;
