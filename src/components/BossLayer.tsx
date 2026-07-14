import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  WORLD_BOSSES,
  createBossRuntime,
  tickBoss,
  damageBoss,
  bossPosition,
  type BossRuntime,
  type BossEvent,
} from '../game/bosses';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';

export type BossAttackFn = (damage: number, range: number) => boolean;

interface BossLayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  bossAttackApi: React.MutableRefObject<BossAttackFn | null>;
}

const BossLayer: React.FC<BossLayerProps> = ({
  playerPosRef,
  bossAttackApi,
}) => {
  const bosses = useMemo(
    () => WORLD_BOSSES.map((d) => createBossRuntime(d)),
    []
  );
  const groups = useRef<(THREE.Group | null)[]>([]);
  const registerBossKill = useGameStore((s) => s.registerBossKill);

  useFrame((_, delta) => {
    const p = playerPosRef.current;
    const alive = useGameStore.getState().playerStats.health > 0;
    const dt = Math.min(delta, 0.05);
    const now = Date.now();
    const events: BossEvent[] = [];

    for (let i = 0; i < bosses.length; i++) {
      const b = bosses[i];
      tickBoss(b, { x: p.x, z: p.z, alive }, dt, now, events);
      const pos = bossPosition(b);
      const g = groups.current[i];
      if (g) {
        g.position.set(pos.x, b.mood === 'dead' ? 0.4 : 1.6, pos.z);
        g.rotation.y = b.rotation;
        g.scale.setScalar(b.mood === 'dead' ? 0.6 : 1.4);
      }
    }

    if (events.length) {
      let dmg = 0;
      for (const e of events) {
        if (e.kind === 'damage_player') dmg += e.amount || 0;
        if (e.kind === 'boss_kill') {
          const s = useGameStore.getState();
          if (e.loot) s.applyBossLoot(e.loot);
          else
            s.updateStats({
              money: s.playerStats.money + (e.money || 0),
              reputation: s.playerStats.reputation + (e.rep || 0),
            });
          registerBossKill();
          gameAudio.play('kill', 0.5);
          s.addAction(`boss_${e.bossId}`);
          if (e.loot) s.addAction(`loot_${e.loot.label}`);
        }
      }
      if (dmg > 0) {
        const s = useGameStore.getState();
        s.updateStats({
          health: Math.max(0, s.playerStats.health - dmg),
        });
        gameAudio.play('hit', 0.4);
      }
    }
  });

  React.useEffect(() => {
    bossAttackApi.current = (damage, range) => {
      const p = playerPosRef.current;
      let hit = false;
      const now = Date.now();
      const events: BossEvent[] = [];
      for (const b of bosses) {
        if (b.mood === 'dead') continue;
        const pos = bossPosition(b);
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        if (dx * dx + dz * dz <= range * range * 1.3) {
          damageBoss(b, damage, now, events);
          hit = true;
        }
      }
      for (const e of events) {
        if (e.kind === 'boss_kill') {
          const s = useGameStore.getState();
          if (e.loot) s.applyBossLoot(e.loot);
          else
            s.updateStats({
              money: s.playerStats.money + (e.money || 0),
              reputation: s.playerStats.reputation + (e.rep || 0),
            });
          registerBossKill();
          gameAudio.play('kill', 0.55);
        }
      }
      return hit;
    };
    return () => {
      bossAttackApi.current = null;
    };
  }, [bosses, bossAttackApi, playerPosRef, registerBossKill]);

  return (
    <group>
      {bosses.map((b, i) => (
        <group
          key={b.def.id}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[b.def.x, 1.6, b.def.z]}
        >
          <mesh castShadow>
            <boxGeometry args={[2.2, 3.2, 2.2]} />
            <meshStandardMaterial
              color={b.mood === 'dead' ? '#222' : '#1a1020'}
              emissive={b.def.color}
              emissiveIntensity={
                b.mood === 'dead'
                  ? 0
                  : b.mood === 'windup'
                    ? 3.2
                    : b.hitFlash > 0
                      ? 2.5
                      : 1.2
              }
              metalness={0.6}
              roughness={0.35}
              toneMapped={false}
            />
          </mesh>
          {/* Attack telegraph ring */}
          {b.mood === 'windup' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[1.2, 2.4, 24]} />
              <meshBasicMaterial
                color={b.def.color}
                transparent
                opacity={0.65}
                depthWrite={false}
              />
            </mesh>
          )}
          <pointLight
            color={b.def.color}
            intensity={b.mood === 'enraged' ? 2 : 0.8}
            distance={16}
          />
          {b.mood !== 'dead' && (
            <Html center position={[0, 2.4, 0]} distanceFactor={14}>
              <div
                style={{
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    color: b.def.color,
                    fontSize: 11,
                    letterSpacing: '0.15em',
                  }}
                >
                  {b.def.name}
                </div>
                <div style={{ color: '#8a8d92', fontSize: 9 }}>
                  {b.def.title}
                </div>
                <div
                  style={{
                    margin: '3px auto 0',
                    width: 80,
                    height: 4,
                    background: '#111',
                    border: '1px solid #333',
                  }}
                >
                  <div
                    style={{
                      width: `${(b.health / b.def.maxHealth) * 100}%`,
                      height: '100%',
                      background: b.def.color,
                    }}
                  />
                </div>
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
};

export default BossLayer;
