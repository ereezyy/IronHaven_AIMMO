import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  KeyboardControls,
  Environment,
  Lightformer,
  Sparkles,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../store/gameState';
import { persistenceService } from '../lib/persistence';
import MMOPlayer from './MMOPlayer';
import MMOWorld from './MMOWorld';
import MMOHUD from './MMOHUD';
import MMOChat from './MMOChat';
import NPCManager from './NPCManager';
import DialogueOverlay from './DialogueOverlay';
import BlackMarket from './BlackMarket';
import AtmosphereOverlay from './AtmosphereOverlay';
import { Npc } from '../game/npc';
import { DialogueOption } from '../game/dialogue';

interface OtherPlayer {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number;
  health: number;
  level: number;
  lastSeen: number;
}

// Loss aversion: dying drops a quarter of your cash on the street. Heat (the
// wanted level) is what gets you killed, so the penalty makes careful,
// de-escalating play pay off rather than reckless spree-running.
export const DEATH_LOSS_FRACTION = 0.25;

const ThirdPersonCamera: React.FC<{
  targetRef: React.MutableRefObject<THREE.Vector3>;
  rotationRef: React.MutableRefObject<number>;
  shakeRef: React.MutableRefObject<number>;
}> = ({ targetRef, rotationRef, shakeRef }) => {
  const { camera } = useThree();
  const distance = useRef(6);
  const offset = useRef(new THREE.Vector3());
  const ideal = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      distance.current = Math.max(
        2,
        Math.min(15, distance.current + e.deltaY * 0.01)
      );
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useFrame((_, delta) => {
    const target = targetRef.current;
    const rot = rotationRef.current;

    offset.current.set(
      Math.sin(rot) * distance.current,
      2,
      Math.cos(rot) * distance.current
    );
    ideal.current.copy(target).add(offset.current);
    camera.position.lerp(ideal.current, 0.1);

    // Decaying random camera shake on player damage.
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta * 2.5);
      const s = shakeRef.current * 0.45;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      camera.position.z += (Math.random() - 0.5) * s;
    }

    look.current.set(target.x, target.y + 1.5, target.z);
    camera.lookAt(look.current);
  });

  return null;
};

// Remote players arrive as discrete ~80ms position snapshots. Lerping the mesh
// toward each new target every frame smooths that into continuous motion, so a
// populated server reads as a living crowd rather than teleporting markers —
// the social proof that makes the world feel alive to a newcomer.
const RemotePlayer: React.FC<{ player: OtherPlayer }> = ({ player }) => {
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(...player.position));

  useEffect(() => {
    target.current.set(
      player.position[0],
      player.position[1],
      player.position[2]
    );
  }, [player.position]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.position.lerp(target.current, 0.18);
    g.rotation.y += (player.rotation - g.rotation.y) * 0.18;
  });

  return (
    <group ref={ref} position={player.position}>
      <mesh castShadow>
        <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
        <meshStandardMaterial color="#cfcfd2" roughness={0.7} metalness={0.1} />
      </mesh>

      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[0.04, 0.45, 0.04]} />
        <meshBasicMaterial color="#3a3a3e" />
      </mesh>

      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#c03a30" />
      </mesh>
    </group>
  );
};

const MMOGame: React.FC = () => {
  const gameStore = useGameStore();
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [playerId] = useState(
    () => `player_${crypto.randomUUID().substring(0, 9)}`
  );
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const playerRotRef = useRef(0);
  const lastBroadcast = useRef(0);
  const lastBroadcastPos = useRef(new THREE.Vector3(0, 1, 0));
  const lastCombat = useRef(false);
  const lastStoreSync = useRef(0);
  const lastAttack = useRef(0);

  const [nearestNpc, setNearestNpc] = useState<Npc | null>(null);
  const [dialogueNpc, setDialogueNpc] = useState<Npc | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const [spawnKey, setSpawnKey] = useState(0);
  const nearestRef = useRef<Npc | null>(null);
  const dialogueOpenRef = useRef(false);
  const marketOpenRef = useRef(false);
  const attackApi = useRef<((damage: number) => void) | null>(null);
  const playerFlashApi = useRef<(() => void) | null>(null);
  const cameraShake = useRef(0);
  const prevHealth = useRef(gameStore.playerStats.health);
  const vignetteTimer = useRef<number | null>(null);
  const [hitVignette, setHitVignette] = useState(false);
  const [deathPenalty, setDeathPenalty] = useState(0);
  const deathHandled = useRef(false);
  const isDead = gameStore.playerStats.health <= 0;

  useEffect(() => {
    gameStore.initializePlayer(`Player_${playerId.slice(-4)}`);

    let cancelled = false;
    const toOther = (p: {
      id: string;
      username: string;
      position: [number, number, number];
      rotation: number;
      health: number;
      level: number;
    }): OtherPlayer => ({
      id: p.id,
      username: p.username,
      position: p.position,
      rotation: p.rotation,
      health: p.health,
      level: p.level,
      lastSeen: Date.now(),
    });

    // Seed the roster once, then stream live row changes (sub-100ms) instead
    // of polling the table on an interval.
    persistenceService.getNearbyPlayers([0, 1, 0], 200).then((list) => {
      if (cancelled) return;
      setOtherPlayers(
        list.filter((p) => p.id !== playerId).map((p) => toOther(p))
      );
    });

    const unsubscribe = persistenceService.subscribeToNearbyPlayers({
      onUpsert: (p) => {
        if (p.id === playerId) return;
        setOtherPlayers((prev) => {
          const next = toOther(p);
          return prev.some((o) => o.id === p.id)
            ? prev.map((o) => (o.id === p.id ? next : o))
            : [...prev, next];
        });
      },
      onRemove: (id) => {
        setOtherPlayers((prev) => prev.filter((o) => o.id !== id));
      },
    });

    // Expire players who stopped sending updates (closed tab, lost connection).
    const cleanupInterval = setInterval(() => {
      setOtherPlayers((prev) =>
        prev.filter((p) => Date.now() - p.lastSeen < 8000)
      );
    }, 2000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [playerId, gameStore]);

  const broadcastPosition = (position: THREE.Vector3, rotation: number) => {
    const now = Date.now();
    const sinceLast = now - lastBroadcast.current;
    // Cap the wire rate at ~12.5/s for snappy (<100ms) presence updates...
    if (sinceLast < 80) return;

    // ...but only actually write when something changed: moved a perceptible
    // amount or flipped combat state. A 2s heartbeat keeps last_seen fresh so
    // idle players don't get expired. This cuts redundant DB writes, so real
    // movement propagates with less contention and the world reads as live.
    const inCombat = gameStore.playerStats.wanted > 0;
    const moved = position.distanceToSquared(lastBroadcastPos.current) > 0.0009;
    const combatChanged = inCombat !== lastCombat.current;
    if (!moved && !combatChanged && sinceLast < 2000) return;

    lastBroadcast.current = now;
    lastBroadcastPos.current.copy(position);
    lastCombat.current = inCombat;

    persistenceService.updateMultiplayerPlayer({
      id: playerId,
      username: gameStore.playerId || 'Player',
      position: [position.x, position.y, position.z],
      rotation,
      velocity: [0, 0, 0],
      health: gameStore.playerStats.health,
      stamina: 100,
      level: 1,
      isInCombat: inCombat,
    });
  };

  const handlePlayerUpdate = (position: THREE.Vector3, rotation: number) => {
    playerPosRef.current.copy(position);
    playerRotRef.current = rotation;
    broadcastPosition(position, rotation);

    const now = Date.now();
    if (now - lastStoreSync.current > 500) {
      lastStoreSync.current = now;
      gameStore.setPlayerPosition([position.x, position.y, position.z]);
    }
  };

  const handleNearest = useCallback((npc: Npc | null) => {
    nearestRef.current = npc;
    setNearestNpc(npc);
  }, []);

  const openDialogue = (npc: Npc) => {
    dialogueOpenRef.current = true;
    setDialogueNpc(npc);
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const closeDialogue = () => {
    dialogueOpenRef.current = false;
    setDialogueNpc(null);
  };

  const openMarket = () => {
    marketOpenRef.current = true;
    setMarketOpen(true);
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const closeMarket = () => {
    marketOpenRef.current = false;
    setMarketOpen(false);
  };

  const handleChoose = (option: DialogueOption) => {
    const eff = option.effect;
    if (!eff) return;
    const ps = gameStore.playerStats;
    gameStore.updateStats({
      money: ps.money + (eff.money || 0),
      reputation: Math.max(0, ps.reputation + (eff.rep || 0)),
      wanted: Math.max(0, Math.min(5, ps.wanted + (eff.wanted || 0))),
    });
  };

  const respawn = () => {
    gameStore.updateStats({ health: 100, wanted: 0 });
    playerPosRef.current.set(0, 1, 0);
    prevHealth.current = 100;
    setDeathPenalty(0);
    setSpawnKey((k) => k + 1);
  };

  // Drive combat feedback off health changes — flash, shake, and a red vignette.
  useEffect(() => {
    const h = gameStore.playerStats.health;
    const prev = prevHealth.current;
    prevHealth.current = h;
    if (h < prev && h > 0) {
      playerFlashApi.current?.();
      cameraShake.current = Math.min(1, cameraShake.current + 0.7);
      setHitVignette(true);
      if (vignetteTimer.current) window.clearTimeout(vignetteTimer.current);
      vignetteTimer.current = window.setTimeout(
        () => setHitVignette(false),
        240
      );
    }
  }, [gameStore.playerStats.health]);

  // Apply the death money-penalty exactly once per death (loss aversion).
  useEffect(() => {
    if (!isDead) {
      deathHandled.current = false;
      return;
    }
    if (deathHandled.current) return;
    deathHandled.current = true;
    const s = useGameStore.getState();
    const lost = Math.round(s.playerStats.money * DEATH_LOSS_FRACTION);
    setDeathPenalty(lost);
    if (lost > 0) s.updateStats({ money: s.playerStats.money - lost });
  }, [isDead]);

  // Heat cools off: with no fresh crimes, the wanted level decays one notch at a
  // time, turning "wanted" into a managed stake instead of a permanent sentence.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useGameStore.getState();
      const w = s.playerStats.wanted;
      if (w > 0 && s.playerStats.health > 0) s.updateStats({ wanted: w - 1 });
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyB' && !dialogueOpenRef.current) {
        if (marketOpenRef.current) closeMarket();
        else openMarket();
      } else if (
        e.code === 'KeyE' &&
        nearestRef.current &&
        !dialogueOpenRef.current &&
        !marketOpenRef.current
      ) {
        openDialogue(nearestRef.current);
      } else if (e.code === 'Escape' && dialogueOpenRef.current) {
        closeDialogue();
      } else if (e.code === 'Escape' && marketOpenRef.current) {
        closeMarket();
      }
    };

    const handleMouseDown = () => {
      if (dialogueOpenRef.current || marketOpenRef.current) return;
      if (!document.pointerLockElement) return;
      const now = Date.now();
      if (now - lastAttack.current < 380) return;
      lastAttack.current = now;
      attackApi.current?.(gameStore.getCurrentWeapon().damage);
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [gameStore]);

  return (
    <div className="w-full h-screen bg-black relative">
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
          { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
          { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
          { name: 'right', keys: ['KeyD', 'ArrowRight'] },
          { name: 'jump', keys: ['Space'] },
          { name: 'sprint', keys: ['ShiftLeft'] },
          { name: 'interact', keys: ['KeyE'] },
          { name: 'attack', keys: ['Mouse0'] },
        ]}
      >
        <Canvas
          shadows
          camera={{ position: [0, 5, 10], fov: 75 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          onCreated={({ gl }) => {
            // Filmic tone mapping + a touch of exposure so bloom highlights
            // roll off cinematically instead of clipping to flat white.
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
          }}
        >
          <color attach="background" args={['#07070a']} />
          {/* Exponential fog reads denser near the horizon than linear fog,
              giving the neon haze a proper Blade Runner falloff. */}
          <fogExp2 attach="fog" args={['#0a0812', 0.014]} />

          <ambientLight intensity={0.18} color="#3a3550" />
          <directionalLight
            position={[50, 60, 25]}
            intensity={0.6}
            color="#cccfd4"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={100}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />
          <directionalLight
            position={[-30, 30, -40]}
            intensity={0.18}
            color="#c03a30"
          />

          <Suspense fallback={null}>
            {/* Procedural image-based lighting: coloured Lightformers act as
                neon billboards reflecting off metallic surfaces. Baked once
                (frames={1}) and fully offline — no external HDRI download. */}
            <Environment resolution={256} frames={1}>
              <Lightformer
                intensity={0.6}
                color="#20242e"
                form="rect"
                position={[0, 12, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[60, 60, 1]}
              />
              <Lightformer
                intensity={2.4}
                color="#ff2d6b"
                form="rect"
                position={[-18, 6, -10]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[20, 8, 1]}
              />
              <Lightformer
                intensity={2.2}
                color="#22d3ee"
                form="rect"
                position={[18, 6, 10]}
                rotation={[0, -Math.PI / 2, 0]}
                scale={[20, 8, 1]}
              />
              <Lightformer
                intensity={1.6}
                color="#f5a524"
                form="rect"
                position={[10, 5, -18]}
                rotation={[0, 0, 0]}
                scale={[16, 6, 1]}
              />
            </Environment>

            {/* Floating embers / ash drifting through the district. */}
            <Sparkles
              count={120}
              scale={[140, 24, 140]}
              position={[0, 10, 0]}
              size={3}
              speed={0.28}
              opacity={0.5}
              color="#ffb066"
            />

            <MMOWorld />

            <MMOPlayer
              key={spawnKey}
              playerId={playerId}
              onUpdate={handlePlayerUpdate}
              flashApi={playerFlashApi}
            />

            <NPCManager
              playerPosRef={playerPosRef}
              onNearest={handleNearest}
              attackApi={attackApi}
            />

            {otherPlayers.map((player) => (
              <RemotePlayer key={player.id} player={player} />
            ))}

            <ThirdPersonCamera
              targetRef={playerPosRef}
              rotationRef={playerRotRef}
              shakeRef={cameraShake}
            />
          </Suspense>

          {/* Post-processing: bloom makes every emissive neon sign, street
              lamp and hit-flash actually glow; the vignette pulls focus to
              the player and deepens the noir mood. */}
          <EffectComposer multisampling={4}>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.7}
              kernelSize={KernelSize.LARGE}
            />
            <Vignette offset={0.3} darkness={0.75} eskil={false} />
          </EffectComposer>
        </Canvas>
      </KeyboardControls>

      <AtmosphereOverlay />

      <MMOHUD
        health={gameStore.playerStats.health}
        stamina={100}
        mana={100}
        level={1}
        experience={0}
        maxExperience={100}
        playersOnline={otherPlayers.length + 1}
        money={gameStore.playerStats.money}
        reputation={gameStore.playerStats.reputation}
        wanted={gameStore.playerStats.wanted}
        kills={gameStore.sessionStats.totalKills}
      />

      <MMOChat />

      {nearestNpc && !dialogueNpc && !isDead && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 font-mono border border-[#222428] bg-black/70 backdrop-blur-sm px-5 py-2 text-center">
          <span className="text-[11px] tracking-[0.18em] uppercase text-neutral-300">
            press <span style={{ color: '#c03a30' }}>e</span> to talk ·{' '}
            {nearestNpc.name}
          </span>
        </div>
      )}

      {dialogueNpc && (
        <DialogueOverlay
          npc={dialogueNpc}
          stats={{
            x: playerPosRef.current.x,
            z: playerPosRef.current.z,
            wanted: gameStore.playerStats.wanted,
            reputation: gameStore.playerStats.reputation,
            kills: gameStore.playerStats.policeKillCount,
          }}
          onChoose={handleChoose}
          onClose={closeDialogue}
        />
      )}

      {marketOpen && !isDead && <BlackMarket onClose={closeMarket} />}

      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-200"
        style={{
          opacity: hitVignette ? 1 : 0,
          background:
            'radial-gradient(circle, transparent 45%, rgba(192,58,48,0.55) 100%)',
        }}
      />

      {isDead && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 font-mono">
          <div className="text-[12px] tracking-[0.4em] uppercase text-neutral-500">
            iron haven
          </div>
          <div
            className="mt-3 text-4xl tracking-[0.3em] uppercase"
            style={{ color: '#c03a30' }}
          >
            wasted
          </div>
          {deathPenalty > 0 && (
            <div className="mt-4 text-[11px] tracking-[0.22em] uppercase text-neutral-400">
              dropped <span className="text-neutral-100">${deathPenalty}</span>{' '}
              on the street
            </div>
          )}
          <button
            onClick={respawn}
            className="mt-8 border border-[#222428] px-8 py-3 text-[11px] tracking-[0.28em] uppercase text-neutral-200 hover:bg-[#15171a] transition-colors"
          >
            respawn
          </button>
        </div>
      )}

      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 font-mono border border-[#222428] bg-black/60 backdrop-blur-sm px-6 py-2.5 text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase text-neutral-300">
          wasd move · space jump · shift sprint · mouse look
        </div>
        <div className="mt-1 text-[10px] tracking-[0.28em] uppercase text-neutral-500">
          scroll to zoom · esc to unlock ·{' '}
          <span style={{ color: '#c03a30' }}>b</span> black market
        </div>
      </div>
    </div>
  );
};

export default MMOGame;
