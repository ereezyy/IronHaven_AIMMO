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
  Sparkles,
  Html,
  Preload,
  useProgress,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
  SSAO,
  ChromaticAberration,
  Noise,
} from '@react-three/postprocessing';
import { KernelSize, BlendFunction } from 'postprocessing';
import ContextLossGuard from './ContextLossGuard';
import { Physics, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store/gameState';
import { persistenceService } from '../lib/persistence';
import MMOPlayer from './MMOPlayer';
import CharacterModel from './CharacterModel';
import MMOWorld from './MMOWorld';
import AmbientVFX from './AmbientVFX';
import MMOHUD from './MMOHUD';
import MMOChat from './MMOChat';
import NPCManager from './NPCManager';
import DialogueOverlay from './DialogueOverlay';
import BlackMarket from './BlackMarket';
import AtmosphereOverlay from './AtmosphereOverlay';
import { Npc } from '../game/npc';
import { DialogueOption } from '../game/dialogue';
import {
  buildingColliderSpecs,
  groundColliderSpec,
  safehouseColliderSpec,
} from '../game/physicsColliders';
import {
  attackCooldownMs,
  buildStreetObjectives,
  scaleDamage,
} from '../game/objectives';
import { applyCrit } from '../game/skills';
import SkillTreePanel from './SkillTreePanel';
import PassPanel from './PassPanel';
import CutscenePlayer from './CutscenePlayer';
import LocationTitle from './LocationTitle';
import MissionBriefing from './MissionBriefing';
import QuestLogPanel from './QuestLogPanel';
import LeaderboardPanel from './LeaderboardPanel';
import WorldEventBanner from './WorldEventBanner';
import ControlsCard from './ControlsCard';
import KillFeed, { type KillFeedEntry } from './KillFeed';
import InteractPrompt from './InteractPrompt';
import GhostLayer from './GhostLayer';
import GuidedTips from './GuidedTips';
import { ACTIVE_ABILITIES, type ActiveAbilityId } from '../game/skills';
import { COLORS } from '../game/uiTheme';
import {
  loadGuidedTipsState,
  currentTip,
  markTipComplete,
  dismissGuidedTips,
  autoCompleteFromSignals,
  type GuidedTipsState,
  type TipId,
} from '../game/guidedTips';
import {
  formatPassRemaining,
  isPassActive as passIsLive,
} from '../game/subscription';
import {
  DISTRICT_DROP_CUTSCENE,
  FIRST_BLOOD_CUTSCENE,
  BOSS_APPROACH_CUTSCENE,
  PASS_WELCOME_CUTSCENE,
  levelUpCutscene,
  deathCutscene,
  factionJoinCutscene,
  type CutsceneScript,
} from '../game/cutscenes';
import type { FactionId } from '../game/factions';
import {
  hasSeenDistrictDrop,
  markDistrictDropSeen,
  hasSeenControlsCard,
} from '../game/onboarding';
import { tickTerritory } from '../game/territory';
import {
  emptyWorldEventState,
  advance as advanceWorldEvents,
  eventRewardMult,
  type WorldEventState,
  type ActiveWorldEvent,
  WORLD_EVENTS,
} from '../game/worldEvents';
import { STARTER_WEAPON_ID } from './BlackMarket';
import type { AttackFn } from './NPCManager';
import { gameAudio } from '../lib/gameAudio';
import {
  aiConfigured,
  aiStreetContract,
  contractProgress,
  type StreetContract,
} from '../lib/npcAi';
import { llmClient } from '../lib/llmClient';
import {
  SUPABASE_CONFIGURED,
  supabase,
  isSupabaseRuntimeOffline,
} from '../lib/supabase';
import AIConfigPanel from './AIConfigPanel';
import { weapons } from './WeaponSystem';
import type { NpcBlip } from './NPCManager';
import EconomyPanel from './EconomyPanel';
import HarvestNodes from './HarvestNodes';
import VehicleLayer, { type VehicleState } from './VehicleLayer';
import type { HarvestNode } from '../game/economy';
import type { VehicleSpawn } from '../game/vehicles';
import {
  sanitizeAvatarWire,
  type AvatarWire,
  type CharacterBuild,
} from '../game/character';
import SocialPanel from './SocialPanel';
import ShopLayer, { ShopUI } from './ShopLayer';
import SafehouseLayer from './SafehouseLayer';
import SafehousePanel from './SafehousePanel';
import { SAFEHOUSE } from '../game/safehouse';
import type { WorldShop } from '../game/shops';
import FishingLayer from './FishingLayer';
import type { FishSpot } from '../game/fishing';
import BossLayer, { type BossAttackFn } from './BossLayer';
import HuntLayer, { type HuntAttackFn } from './HuntLayer';
import {
  zoneAt,
  allowsPvp,
  isSafeZoneAt,
  isSpawnProtected,
  grantSpawnProtection,
} from '../game/zones';
import { getFaction } from '../game/factions';
import { levelFromXp } from '../game/progression';
import { WORLD_BOSSES } from '../game/bosses';

interface OtherPlayer {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number;
  health: number;
  level: number;
  lastSeen: number;
  factionId?: string;
  pvp?: boolean;
  clubTag?: string;
  avatar?: AvatarWire | null;
}

// Loss aversion: dying drops a quarter of your cash on the street. Heat (the
// wanted level) is what gets you killed, so the penalty makes careful,
// de-escalating play pay off rather than reckless spree-running.
export const DEATH_LOSS_FRACTION = 0.25;

// Subtle lens fringing, radially modulated so it only shows near the screen
// edges — cinematic without smearing the crosshair area.
const CA_OFFSET = new THREE.Vector2(0.0005, 0.001);

// Full-screen loading gate driven by the three.js loader queue (HDRI,
// textures, models). A modern MMO never shows a half-loaded world; this
// fades out once every asset is resident. The failsafe timer guarantees we
// never trap the player on the loader if an asset 404s.
const LoadingScreen: React.FC = () => {
  const { active, progress } = useProgress();
  const [gone, setGone] = useState(false);
  const done = !active && progress >= 100;

  useEffect(() => {
    const failsafe = setTimeout(() => setGone(true), 12000);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 750);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050507] font-mono transition-opacity duration-700 ${
        done ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="text-[12px] tracking-[0.5em] uppercase text-neutral-500">
        entering
      </div>
      <div
        className="mt-3 text-3xl tracking-[0.35em] uppercase"
        style={{ color: '#c03a30' }}
      >
        iron haven
      </div>
      <div className="mt-10 h-[3px] w-64 border border-[#222428] bg-black/60">
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${progress}%`, background: '#c03a30' }}
        />
      </div>
      <div className="mt-3 text-[10px] tracking-[0.3em] uppercase text-neutral-600">
        {Math.round(progress)}% · streaming district assets
      </div>
    </div>
  );
};

// Fixed Rapier colliders for the static world: one ground slab plus one
// cuboid per city building. Standalone colliders (no RigidBody parent) are
// fixed, so this is pure setup cost — nothing here ever steps.
const StaticWorldColliders: React.FC = () => {
  const buildings = React.useMemo(() => buildingColliderSpecs(), []);
  const ground = React.useMemo(() => groundColliderSpec(), []);
  const safehouse = React.useMemo(() => safehouseColliderSpec(), []);
  return (
    <>
      <CuboidCollider args={ground.halfExtents} position={ground.position} />
      <CuboidCollider
        args={safehouse.halfExtents}
        position={safehouse.position}
      />
      {buildings.map((b, i) => (
        <CuboidCollider
          key={`bcol-${i}`}
          args={b.halfExtents}
          position={b.position}
        />
      ))}
    </>
  );
};

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
  const speedRef = useRef(0);

  useEffect(() => {
    target.current.set(
      player.position[0],
      player.position[1],
      player.position[2]
    );
  }, [player.position]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const before = g.position.clone();
    g.position.lerp(target.current, 0.18);
    g.rotation.y += (player.rotation - g.rotation.y) * 0.18;
    // Estimate ground speed from the smoothed motion so the walk/run
    // animation blender tracks what the player is visually doing.
    const moved = g.position.distanceTo(before);
    const instant = delta > 0 ? moved / delta : 0;
    speedRef.current += (instant - speedRef.current) * 0.2;
  });

  const hp = Math.max(0, Math.min(100, player.health));

  return (
    <group ref={ref} position={player.position}>
      {/* MMO nameplate: name, level and health bar floating above the head,
          scaled down with distance like every modern online game. */}
      <Html
        center
        position={[0, 2.9, 0]}
        distanceFactor={12}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            whiteSpace: 'nowrap',
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
        >
          <div
            style={{
              color: '#e5e5e8',
              fontSize: 12,
              letterSpacing: '0.12em',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {player.clubTag ? `[${player.clubTag}] ` : ''}
            <span
              style={{
                color: player.factionId
                  ? getFaction(player.factionId as FactionId).color
                  : '#e5e5e8',
              }}
            >
              {player.username}
            </span>
            <span style={{ color: '#8a8d93' }}> · </span>
            <span style={{ color: '#c9a15a' }}>lv {player.level}</span>
            {player.pvp ? (
              <span style={{ color: '#c03a30' }}> · PvP</span>
            ) : null}
          </div>
          <div
            style={{
              margin: '3px auto 0',
              width: 72,
              height: 3,
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid #222428',
            }}
          >
            <div
              style={{
                width: `${hp}%`,
                height: '100%',
                background: hp > 35 ? '#3f7d4e' : '#c03a30',
              }}
            />
          </div>
        </div>
      </Html>

      {/* Animated character wearing the synced avatar; the cooler fallback
          tint only covers legacy rows written before avatar sync shipped.
          Yaw arrives as the sender's mouseX — same unflipped convention as
          the local player, so no extra rotation here. */}
      <group position={[0, -1, 0]}>
        {player.avatar ? (
          <CharacterModel
            speedRef={speedRef}
            tint={player.avatar.appearance.tint}
            accent={player.avatar.appearance.accent}
            accent2={player.avatar.appearance.accent2}
            skinTone={player.avatar.appearance.skinTone}
            gear={player.avatar.appearance.gear}
            archetype={player.avatar.archetype}
            bodyScale={player.avatar.appearance.bodyScale}
            parts={player.avatar.parts}
          />
        ) : (
          <CharacterModel speedRef={speedRef} tint="#9fb2c8" />
        )}
      </group>
    </group>
  );
};

interface MMOGameProps {
  initialCallsign?: string;
  initialBuild?: CharacterBuild;
}

const MMOGame: React.FC<MMOGameProps> = ({ initialCallsign, initialBuild }) => {
  const gameStore = useGameStore();
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [playerId] = useState(() => `player_${crypto.randomUUID()}`);
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
  const [economyOpen, setEconomyOpen] = useState(false);
  const [spawnKey, setSpawnKey] = useState(0);
  const nearestRef = useRef<Npc | null>(null);
  const dialogueOpenRef = useRef(false);
  const marketOpenRef = useRef(false);
  const economyOpenRef = useRef(false);
  const attackApi = useRef<AttackFn | null>(null);
  const playerFlashApi = useRef<(() => void) | null>(null);
  const cameraShake = useRef(0);
  const prevHealth = useRef(gameStore.playerStats.health);
  const vignetteTimer = useRef<number | null>(null);
  const [hitVignette, setHitVignette] = useState(false);
  const [deathPenalty, setDeathPenalty] = useState(0);
  const deathHandled = useRef(false);
  const isDead = gameStore.playerStats.health <= 0;
  // Ref mirror of isDead so the R3F frame loops read it without re-render.
  const deadRef = useRef(isDead);
  deadRef.current = isDead;
  const staminaRef = useRef(100);
  const [hasTalked, setHasTalked] = useState(false);
  const rewardedObjectives = useRef<Set<string>>(new Set());
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [aiReady, setAiReady] = useState(() => llmClient.isConfigured());
  const [aiContract, setAiContract] = useState<StreetContract | null>(null);
  /** Contract waiting on accept/decline briefing. */
  const [pendingBrief, setPendingBrief] = useState<StreetContract | null>(null);
  const [aiContractLoading, setAiContractLoading] = useState(false);
  const [talkCount, setTalkCount] = useState(0);
  const [contractToast, setContractToast] = useState<string | null>(null);
  const prevKills = useRef(gameStore.sessionStats.totalKills);
  const prevWanted = useRef(gameStore.playerStats.wanted);
  const npcBlipsRef = useRef<NpcBlip[]>([]);
  const contractPaid = useRef<string | null>(null);
  const [nearestHarvest, setNearestHarvest] = useState<HarvestNode | null>(
    null
  );
  const [nearestVehicle, setNearestVehicle] = useState<VehicleSpawn | null>(
    null
  );
  const nearestHarvestRef = useRef<HarvestNode | null>(null);
  const nearestVehicleRef = useRef<VehicleSpawn | null>(null);
  const harvestApi = useRef<(() => boolean) | null>(null);
  const vehicleEnterApi = useRef<(() => boolean) | null>(null);
  const vehicleExitApi = useRef<(() => void) | null>(null);
  const vehicleState = useRef<VehicleState>({ id: null, driving: false });
  const drivingRef = useRef(false);
  const [isDriving, setIsDriving] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const socialOpenRef = useRef(false);
  const [nearestShop, setNearestShop] = useState<WorldShop | null>(null);
  const nearestShopRef = useRef<WorldShop | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [nearSafehouse, setNearSafehouse] = useState(false);
  const nearSafehouseRef = useRef(false);
  const [safehouseOpen, setSafehouseOpen] = useState(false);
  const safehouseOpenRef = useRef(false);
  const [nearestFish, setNearestFish] = useState<FishSpot | null>(null);
  const nearestFishRef = useRef<FishSpot | null>(null);
  const castApi = useRef<(() => void) | null>(null);
  const fishingRef = useRef(false);
  const [isFishing, setIsFishing] = useState(false);
  const bossAttackApi = useRef<BossAttackFn | null>(null);
  const huntAttackApi = useRef<HuntAttackFn | null>(null);
  const pvpChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const [zoneLabel, setZoneLabel] = useState('Open Streets');
  const [levelUpFlash, setLevelUpFlash] = useState<number | null>(null);
  const prevLevel = useRef(gameStore.playerStats.level);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const skillsOpenRef = useRef(false);
  const [passOpen, setPassOpen] = useState(false);
  const passOpenRef = useRef(false);
  const [questOpen, setQuestOpen] = useState(false);
  const questOpenRef = useRef(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const leaderboardOpenRef = useRef(false);
  // Dynamic world events (turf war, boss raid, heat wave, gold rush).
  const worldEventRef = useRef<WorldEventState>(emptyWorldEventState());
  const [activeWorldEvent, setActiveWorldEvent] =
    useState<ActiveWorldEvent | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [tipsState, setTipsState] = useState<GuidedTipsState>(() =>
    loadGuidedTipsState()
  );
  const [tipsReady, setTipsReady] = useState(false);
  const spawnOrigin = useRef(new THREE.Vector3(0, 1, 0));
  const movedFarRef = useRef(false);
  const tookJobRef = useRef(false);
  const openedQuestRef = useRef(false);
  const openedSkillsRef = useRef(false);
  const lastTerritoryTick = useRef(0);
  /** Active full-screen cutscene (null = none). */
  const [activeCutscene, setActiveCutscene] = useState<CutsceneScript | null>(
    null
  );
  const cutsceneRef = useRef(false);
  const districtDropDone = useRef(hasSeenDistrictDrop());
  const firstBloodDone = useRef(false);
  const bossApproachDone = useRef(false);
  const prevPassActive = useRef(false);
  const [zoneSplash, setZoneSplash] = useState<{
    title: string;
    sub: string;
  } | null>(null);
  const lastZoneSplash = useRef('');
  const [abilityFlash, setAbilityFlash] = useState<string | null>(null);
  const [lastCrit, setLastCrit] = useState(false);

  // Unlock procedural audio after the first gesture (autoplay policy).
  useEffect(() => {
    const unlock = () => {
      void gameAudio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // One-shot init guard: the store snapshot changes identity on every set(),
  // so this must never key off `gameStore` or applyCharacter loops (#185).
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (!initDoneRef.current) {
      initDoneRef.current = true;
      // Fresh entry into the world gets the same grace window as a respawn.
      grantSpawnProtection();
      const store = useGameStore.getState();
      if (initialBuild) {
        store.applyCharacter(initialBuild);
      }
      const name =
        initialBuild?.callsign ||
        initialCallsign ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('ironhaven-username') || undefined
          : undefined);
      if (name) store.setUsername(name);
      store.initializePlayer(name || `Runner_${playerId.slice(-4)}`);
    }

    let cancelled = false;
    const toOther = (p: {
      id: string;
      username: string;
      position: [number, number, number];
      rotation: number;
      health: number;
      level: number;
      avatar?: unknown;
    }): OtherPlayer => ({
      id: p.id,
      username: p.username,
      position: p.position,
      rotation: p.rotation,
      health: p.health,
      level: p.level,
      lastSeen: Date.now(),
      avatar: sanitizeAvatarWire(p.avatar),
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
  }, [playerId, initialBuild, initialCallsign]);

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

    const s = useGameStore.getState();
    persistenceService.updateMultiplayerPlayer({
      id: playerId,
      username: s.username || 'Runner',
      position: [position.x, position.y, position.z],
      rotation,
      velocity: [0, 0, 0],
      health: s.playerStats.health,
      stamina: staminaRef.current,
      level: s.playerStats.level || levelFromXp(s.playerStats.xp || 0).level,
      isInCombat: inCombat,
      // Cosmetic loadout rides on the presence row so remotes render the
      // real character instead of a placeholder.
      avatar: {
        archetype: s.character.archetype,
        appearance: s.character.appearance,
        parts: s.character.parts,
      },
    });

    // Zone label + fishing cast progress poll.
    const z = zoneAt(position.x, position.z);
    if (z.label !== zoneLabel) setZoneLabel(z.label);
    if (fishingRef.current !== isFishing) setIsFishing(fishingRef.current);

    // First boss proximity — one-shot cinematic (~22m of a world boss).
    if (
      !bossApproachDone.current &&
      districtDropDone.current &&
      !cutsceneRef.current
    ) {
      for (const b of WORLD_BOSSES) {
        const dx = b.x - position.x;
        const dz = b.z - position.z;
        if (dx * dx + dz * dz < 22 * 22) {
          bossApproachDone.current = true;
          cutsceneRef.current = true;
          setActiveCutscene(BOSS_APPROACH_CUTSCENE);
          if (document.pointerLockElement) document.exitPointerLock();
          break;
        }
      }
    }
  };

  // PvP hit channel — open-world player damage.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const ch = supabase.channel('ironhaven-pvp');
    ch.on('broadcast', { event: 'pvp-hit' }, ({ payload }) => {
      const hit = payload as {
        targetId: string;
        damage: number;
        from: string;
      };
      if (hit.targetId !== playerId && hit.targetId !== gameStore.playerId)
        return;
      // Safe zone / spawn grace also shields against PvP hits.
      const pp = playerPosRef.current;
      if (isSafeZoneAt(pp.x, pp.z) || isSpawnProtected()) return;
      const s = useGameStore.getState();
      s.updateStats({
        health: Math.max(0, s.playerStats.health - (hit.damage || 10)),
      });
      gameAudio.play('hit', 0.45);
      s.addAction(`pvp_hit_by_${hit.from}`);
    }).subscribe();
    pvpChannelRef.current = ch;
    return () => {
      ch.unsubscribe();
      pvpChannelRef.current = null;
    };
  }, [playerId, gameStore.playerId]);

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
    gameAudio.play('talk', 0.2);
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const closeDialogue = () => {
    dialogueOpenRef.current = false;
    setDialogueNpc(null);
  };

  const openMarket = () => {
    marketOpenRef.current = true;
    setMarketOpen(true);
    gameAudio.play('market', 0.2);
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const closeMarket = () => {
    marketOpenRef.current = false;
    setMarketOpen(false);
  };

  const requestAiContract = async () => {
    if (aiContractLoading || pendingBrief || cutsceneRef.current) return;
    setAiContractLoading(true);
    const s = useGameStore.getState();
    const snap = {
      x: playerPosRef.current.x,
      z: playerPosRef.current.z,
      wanted: s.playerStats.wanted,
      reputation: s.playerStats.reputation,
      kills: s.sessionStats.totalKills,
    };
    const contract = await aiStreetContract(
      snap,
      s.playerStats.money,
      talkCount
    );
    contractPaid.current = null;
    setAiContractLoading(false);
    // Dossier first — only goes live on Accept.
    setPendingBrief(contract);
    if (document.pointerLockElement) document.exitPointerLock();
    gameAudio.play('ui', 0.15);
  };

  const acceptBrief = () => {
    if (!pendingBrief) return;
    setAiContract(pendingBrief);
    setPendingBrief(null);
    tookJobRef.current = true;
    gameAudio.play('market', 0.3);
    gameStore.addAction(`contract_accept_${pendingBrief.id}`);
  };

  const completeTip = useCallback((id: TipId) => {
    setTipsState((s) => markTipComplete(s, id));
  }, []);

  const skipTipTour = useCallback(() => {
    setTipsState((s) => dismissGuidedTips(s));
  }, []);

  const declineBrief = () => {
    if (pendingBrief)
      gameStore.addAction(`contract_decline_${pendingBrief.id}`);
    setPendingBrief(null);
    gameAudio.play('ui', 0.1);
  };

  const handleFactionJoined = (id: FactionId) => {
    const script = factionJoinCutscene(id);
    if (!script || cutsceneRef.current) return;
    cutsceneRef.current = true;
    setActiveCutscene(script);
    if (document.pointerLockElement) document.exitPointerLock();
  };

  // Complete Grok/street contracts when mechanical goals are met.
  useEffect(() => {
    if (!aiContract || contractPaid.current === aiContract.id) return;
    const prog = contractProgress(aiContract, {
      kills: gameStore.sessionStats.totalKills,
      money: gameStore.playerStats.money,
      talks: talkCount,
      reputation: gameStore.playerStats.reputation,
      wanted: gameStore.playerStats.wanted,
    });
    if (!prog.done) return;
    contractPaid.current = aiContract.id;
    const reward = aiContract.reward;
    const title = aiContract.title;
    gameStore.updateStats({
      money: gameStore.playerStats.money + reward,
      reputation: gameStore.playerStats.reputation + 5,
    });
    gameStore.gainXp('contract');
    gameStore.addAction(`contract_done_${aiContract.id}`);
    gameAudio.play('market', 0.35);
    setContractToast(`+$${reward} · ${title}`);
    setAiContract(null);
    const t = window.setTimeout(() => setContractToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [
    aiContract,
    talkCount,
    gameStore.sessionStats.totalKills,
    gameStore.playerStats.money,
    gameStore.playerStats.reputation,
    gameStore.playerStats.wanted,
    gameStore,
  ]);

  const handleChoose = (option: DialogueOption) => {
    if (!hasTalked) setHasTalked(true);
    setTalkCount((n) => n + 1);
    gameStore.addAction('talked');
    gameStore.noteBoardEvent('talk');
    gameStore.gainXp('talk');
    const eff = option.effect;
    if (!eff) return;
    const ps = gameStore.playerStats;
    // Block purchases the player can't afford (overlay also greys them out).
    if (eff.money && eff.money < 0 && ps.money + eff.money < 0) return;
    gameStore.updateStats({
      money: Math.max(0, ps.money + (eff.money || 0)),
      reputation: Math.max(0, ps.reputation + (eff.rep || 0)),
      wanted: Math.max(0, Math.min(5, ps.wanted + (eff.wanted || 0))),
      health: Math.max(0, Math.min(100, ps.health + (eff.health || 0))),
    });
  };

  const respawn = () => {
    gameStore.updateStats({ health: 100, wanted: 0 });
    playerPosRef.current.set(0, 1, 0);
    prevHealth.current = 100;
    setDeathPenalty(0);
    grantSpawnProtection();
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
      gameAudio.play('hit', 0.4);
      if (vignetteTimer.current) window.clearTimeout(vignetteTimer.current);
      vignetteTimer.current = window.setTimeout(
        () => setHitVignette(false),
        240
      );
    }
  }, [gameStore.playerStats.health]);

  // Kill stinger when session kill count ticks up.
  useEffect(() => {
    const k = gameStore.sessionStats.totalKills;
    if (k > prevKills.current) gameAudio.play('kill', 0.45);
    prevKills.current = k;
  }, [gameStore.sessionStats.totalKills]);

  // Level-up cinematic (after district drop).
  useEffect(() => {
    const lv = gameStore.playerStats.level;
    if (lv > prevLevel.current) {
      setLevelUpFlash(lv);
      gameAudio.play('market', 0.4);
      if (districtDropDone.current && !cutsceneRef.current) {
        cutsceneRef.current = true;
        setActiveCutscene(levelUpCutscene(lv));
      }
      const t = window.setTimeout(() => setLevelUpFlash(null), 3500);
      prevLevel.current = lv;
      return () => window.clearTimeout(t);
    }
    prevLevel.current = lv;
  }, [gameStore.playerStats.level]);

  // District drop cinematic once on first enter (skipped if already seen).
  useEffect(() => {
    if (districtDropDone.current) {
      if (!hasSeenControlsCard()) {
        const t = window.setTimeout(() => setControlsOpen(true), 600);
        return () => window.clearTimeout(t);
      }
      // Controls already seen — enable coach after a short beat.
      const t = window.setTimeout(() => setTipsReady(true), 800);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      if (districtDropDone.current) return;
      districtDropDone.current = true;
      markDistrictDropSeen();
      cutsceneRef.current = true;
      setActiveCutscene(DISTRICT_DROP_CUTSCENE);
      if (document.pointerLockElement) document.exitPointerLock();
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  // Enable guided tips after controls card closes (or if already dismissed).
  useEffect(() => {
    if (controlsOpen) return;
    if (!districtDropDone.current) return;
    if (activeCutscene) return;
    if (hasSeenControlsCard() || tipsReady) {
      const t = window.setTimeout(() => setTipsReady(true), 400);
      return () => window.clearTimeout(t);
    }
  }, [controlsOpen, activeCutscene, tipsReady]);

  // Poll world signals to auto-complete coach tips.
  useEffect(() => {
    if (!tipsReady) return;
    const id = window.setInterval(() => {
      const pos = playerPosRef.current;
      if (!movedFarRef.current) {
        const d = pos.distanceToSquared(spawnOrigin.current);
        if (d > 36) movedFarRef.current = true; // ~6m
      }
      const harvested =
        (useGameStore.getState().boardCounters.harvests || 0) > 0;
      setTipsState((prev) => {
        if (prev.dismissed || prev.finished) return prev;
        const next = autoCompleteFromSignals(prev, {
          pointerLocked: Boolean(document.pointerLockElement),
          movedFar: movedFarRef.current,
          talked: hasTalked || talkCount > 0,
          harvested,
          tookJob: tookJobRef.current || Boolean(aiContract),
          openedQuest: openedQuestRef.current,
          openedSkills: openedSkillsRef.current,
        });
        if (
          next.completed.length === prev.completed.length &&
          next.finished === prev.finished
        ) {
          return prev;
        }
        return next;
      });
    }, 400);
    return () => window.clearInterval(id);
  }, [tipsReady, hasTalked, talkCount, aiContract]);

  const pushFeed = useCallback((text: string, tone?: KillFeedEntry['tone']) => {
    setKillFeed((prev) =>
      [
        ...prev.slice(-12),
        {
          id: crypto.randomUUID(),
          text,
          at: Date.now(),
          tone,
        },
      ].slice(-12)
    );
  }, []);

  // Kill feed when session kills tick.
  useEffect(() => {
    const k = gameStore.sessionStats.totalKills;
    if (k > prevKills.current && k > 0) {
      pushFeed(`+kill · total ${k}`, 'kill');
      // Bonus XP while a world event is live.
      const mult = eventRewardMult(worldEventRef.current, Date.now());
      if (mult > 1) {
        const bonus = Math.round(10 * (mult - 1));
        if (bonus > 0) {
          useGameStore.getState().gainXp('contract', bonus);
          pushFeed(`event bonus · +${bonus} xp (x${mult})`, 'info');
        }
      }
    }
  }, [gameStore.sessionStats.totalKills, pushFeed]);

  // Territory capture tick ~4Hz
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastTerritoryTick.current < 200) return;
      const dt = Math.min(
        0.5,
        (now - (lastTerritoryTick.current || now - 250)) / 1000
      );
      lastTerritoryTick.current = now;
      const s = useGameStore.getState();
      if (s.playerStats.health <= 0) return;
      const res = tickTerritory(
        s.territory,
        s.factionId,
        playerPosRef.current.x,
        playerPosRef.current.z,
        dt
      );
      if (res.state !== s.territory) s.setTerritory(res.state);
      const zoneFlipped = Boolean(res.event);
      if (res.event) pushFeed(res.event, 'territory');
      if (res.standingDelta) {
        s.adjustFactionStanding(res.standingDelta.id, res.standingDelta.delta);
      }

      // Advance dynamic world-event machine off the same tick.
      const control = res.state.control;
      const counts: Record<string, number> = {};
      let dominant = s.factionId;
      let best = 0;
      for (const owner of Object.values(control)) {
        if (!owner || owner === 'null') continue;
        counts[owner] = (counts[owner] || 0) + 1;
        if (counts[owner] > best) {
          best = counts[owner];
          dominant = owner;
        }
      }
      const trans = advanceWorldEvents(worldEventRef.current, {
        now,
        totalKills: s.sessionStats.totalKills,
        pvpKills: s.sessionStats.pvpKills,
        bossKills: s.sessionStats.bossKills,
        moneyEarned: s.sessionStats.totalMoneyEarned,
        zoneFlipped,
        dominantFaction: dominant,
      });
      if (trans.state !== worldEventRef.current) {
        worldEventRef.current = trans.state;
        setActiveWorldEvent(trans.state.active);
      }
      if (trans.started) {
        pushFeed(
          `${trans.started.title} · ${trans.started.blurb}`,
          trans.started.tone
        );
        gameAudio.play('siren', 0.18);
      }
      if (trans.ended) {
        pushFeed(`${trans.ended.title} ended`, 'info');
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [pushFeed]);

  // Periodic board sync (money earned etc.)
  useEffect(() => {
    const id = window.setInterval(() => {
      useGameStore.getState().noteBoardEvent('money');
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  // First blood one-shot.
  useEffect(() => {
    const k = gameStore.sessionStats.totalKills;
    if (k > 0 && !firstBloodDone.current && districtDropDone.current) {
      firstBloodDone.current = true;
      if (!cutsceneRef.current) {
        cutsceneRef.current = true;
        setActiveCutscene(FIRST_BLOOD_CUTSCENE);
        if (document.pointerLockElement) document.exitPointerLock();
      }
    }
  }, [gameStore.sessionStats.totalKills]);

  // Pass welcome when subscription flips on.
  useEffect(() => {
    const on = passIsLive(gameStore.pass);
    if (on && !prevPassActive.current && districtDropDone.current) {
      if (!cutsceneRef.current) {
        cutsceneRef.current = true;
        setActiveCutscene(PASS_WELCOME_CUTSCENE);
        if (document.pointerLockElement) document.exitPointerLock();
      }
    }
    prevPassActive.current = on;
  }, [gameStore.pass]);

  // Zone enter splash titles (after district drop cinematic).
  useEffect(() => {
    if (!districtDropDone.current) return;
    if (!zoneLabel || zoneLabel === lastZoneSplash.current) return;
    if (cutsceneRef.current) return;
    lastZoneSplash.current = zoneLabel;
    setZoneSplash({
      title: zoneLabel,
      sub:
        gameStore.pvpEnabled || zoneLabel.toLowerCase().includes('pvp')
          ? 'open world · pvp live'
          : 'open world · district',
    });
  }, [zoneLabel, gameStore.pvpEnabled]);

  // Siren pulse when heat escalates.
  useEffect(() => {
    const w = gameStore.playerStats.wanted;
    if (w > prevWanted.current) gameAudio.play('siren', 0.25);
    prevWanted.current = w;
  }, [gameStore.playerStats.wanted]);

  // Apply the death money-penalty exactly once per death (loss aversion).
  useEffect(() => {
    if (!isDead) {
      deathHandled.current = false;
      return;
    }
    if (deathHandled.current) return;
    deathHandled.current = true;
    gameAudio.play('death', 0.5);
    const s = useGameStore.getState();
    const lost = Math.round(s.playerStats.money * DEATH_LOSS_FRACTION);
    setDeathPenalty(lost);
    if (lost > 0) s.updateStats({ money: s.playerStats.money - lost });
    if (!cutsceneRef.current) {
      cutsceneRef.current = true;
      setActiveCutscene(deathCutscene(lost));
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [isDead]);

  // Heat cools off — skill "Ghost Walk" accelerates decay.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useGameStore.getState();
      const w = s.playerStats.wanted;
      if (w > 0 && s.playerStats.health > 0) {
        const decay = s.getModifiers().wantedDecay;
        // Base 1 star / 30s; higher decay rolls chance for extra star.
        let drop = 1;
        if (decay > 1.2 && Math.random() < decay - 1) drop = 2;
        s.updateStats({ wanted: Math.max(0, w - drop) });
      }
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  // One-shot cash when a street contract first completes (never during render).
  useEffect(() => {
    const s = useGameStore.getState();
    const hasWeapon =
      s.currentWeaponId !== STARTER_WEAPON_ID || s.inventory.length > 0;
    const street = buildStreetObjectives({
      talked: hasTalked,
      kills: s.sessionStats.totalKills,
      money: s.playerStats.money,
      reputation: s.playerStats.reputation,
      hasWeapon,
      combatSkill: s.playerStats.skills.combat,
    });
    let bonus = 0;
    for (const o of street) {
      if (o.done && !rewardedObjectives.current.has(o.id) && o.reward > 0) {
        rewardedObjectives.current.add(o.id);
        bonus += o.reward;
        s.addAction(`contract_${o.id}`);
      }
    }
    if (bonus > 0) {
      s.updateStats({ money: s.playerStats.money + bonus });
    }
  }, [
    hasTalked,
    gameStore.sessionStats.totalKills,
    gameStore.playerStats.money,
    gameStore.playerStats.reputation,
    gameStore.playerStats.skills.combat,
    gameStore.currentWeaponId,
    gameStore.inventory,
  ]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const blocked =
        dialogueOpenRef.current ||
        marketOpenRef.current ||
        economyOpenRef.current ||
        socialOpenRef.current ||
        skillsOpenRef.current ||
        passOpenRef.current ||
        questOpenRef.current ||
        leaderboardOpenRef.current ||
        cutsceneRef.current ||
        Boolean(pendingBrief) ||
        controlsOpen ||
        shopOpen ||
        safehouseOpenRef.current;

      if (e.code === 'KeyL') {
        setQuestOpen((v) => {
          const next = !v;
          questOpenRef.current = next;
          if (next) openedQuestRef.current = true;
          if (!v && document.pointerLockElement) document.exitPointerLock();
          return next;
        });
        gameAudio.play('ui', 0.12);
        return;
      }

      if (e.code === 'KeyK') {
        setSkillsOpen((v) => {
          const next = !v;
          skillsOpenRef.current = next;
          if (next) openedSkillsRef.current = true;
          if (!v && document.pointerLockElement) document.exitPointerLock();
          return next;
        });
        gameAudio.play('ui', 0.15);
        return;
      }

      // Seasonal leaderboard
      if (e.code === 'KeyY') {
        setLeaderboardOpen((v) => {
          leaderboardOpenRef.current = !v;
          if (!v && document.pointerLockElement) document.exitPointerLock();
          return !v;
        });
        gameAudio.play('ui', 0.14);
        return;
      }

      // Iron Haven Pass ($1.99/wk)
      if (e.code === 'KeyO') {
        setPassOpen((v) => {
          passOpenRef.current = !v;
          if (!v && document.pointerLockElement) document.exitPointerLock();
          return !v;
        });
        gameAudio.play('ui', 0.15);
        return;
      }

      // Ability hotbar 5–8
      if (
        !blocked &&
        (e.code === 'Digit5' ||
          e.code === 'Digit6' ||
          e.code === 'Digit7' ||
          e.code === 'Digit8')
      ) {
        const slot = parseInt(e.code.replace('Digit', ''), 10) - 5;
        const id = useGameStore.getState().abilityBar[slot];
        if (id) {
          const res = useGameStore.getState().castAbility(id);
          if (res.ok) {
            gameAudio.play('market', 0.25);
            setAbilityFlash(ACTIVE_ABILITIES[id].name);
            window.setTimeout(() => setAbilityFlash(null), 1200);
          } else {
            gameAudio.play('ui', 0.08);
          }
        }
        return;
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        setEconomyOpen((v) => {
          economyOpenRef.current = !v;
          if (!v && document.pointerLockElement) document.exitPointerLock();
          return !v;
        });
        gameAudio.play('ui', 0.12);
        return;
      }
      if (e.code === 'KeyB' && !dialogueOpenRef.current) {
        if (marketOpenRef.current) closeMarket();
        else openMarket();
      } else if (e.code === 'KeyG') {
        setAiPanelOpen((v) => !v);
        if (document.pointerLockElement) document.exitPointerLock();
      } else if (e.code === 'KeyU') {
        setSocialOpen((v) => {
          socialOpenRef.current = !v;
          if (!v && document.pointerLockElement) document.exitPointerLock();
          return !v;
        });
      } else if (e.code === 'KeyP' && !e.ctrlKey) {
        const s = useGameStore.getState();
        s.setPvpEnabled(!s.pvpEnabled);
        gameAudio.play('siren', 0.12);
      } else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
        setMuted(gameAudio.toggleMute());
      } else if (e.code === 'KeyJ') {
        void requestAiContract();
      } else if (e.code === 'KeyR' && !blocked) {
        harvestApi.current?.();
      } else if (e.code === 'KeyC' && !blocked) {
        castApi.current?.();
      } else if (e.code === 'KeyH' && !blocked) {
        if (useGameStore.getState().useStim()) gameAudio.play('talk', 0.2);
      } else if (e.code === 'KeyF' && !blocked) {
        if (drivingRef.current) vehicleExitApi.current?.();
        else vehicleEnterApi.current?.();
      } else if (e.code === 'KeyE' && !blocked) {
        if (nearestRef.current) openDialogue(nearestRef.current);
        else if (nearestShopRef.current) {
          setShopOpen(true);
          if (document.pointerLockElement) document.exitPointerLock();
          gameAudio.play('market', 0.15);
        } else if (nearSafehouseRef.current) {
          safehouseOpenRef.current = true;
          setSafehouseOpen(true);
          if (document.pointerLockElement) document.exitPointerLock();
          gameAudio.play('ui', 0.15);
        }
      } else if (e.code === 'Escape' && dialogueOpenRef.current) {
        closeDialogue();
      } else if (e.code === 'Escape' && marketOpenRef.current) {
        closeMarket();
      } else if (e.code === 'Escape' && shopOpen) {
        setShopOpen(false);
      } else if (e.code === 'Escape' && safehouseOpenRef.current) {
        safehouseOpenRef.current = false;
        setSafehouseOpen(false);
      } else if (e.code === 'Escape' && economyOpenRef.current) {
        economyOpenRef.current = false;
        setEconomyOpen(false);
      } else if (e.code === 'Escape' && socialOpenRef.current) {
        socialOpenRef.current = false;
        setSocialOpen(false);
      } else if (e.code === 'Escape' && skillsOpenRef.current) {
        skillsOpenRef.current = false;
        setSkillsOpen(false);
      } else if (e.code === 'Escape' && passOpenRef.current) {
        passOpenRef.current = false;
        setPassOpen(false);
      } else if (e.code === 'Escape' && questOpenRef.current) {
        questOpenRef.current = false;
        setQuestOpen(false);
      } else if (e.code === 'Escape' && leaderboardOpenRef.current) {
        leaderboardOpenRef.current = false;
        setLeaderboardOpen(false);
      } else if (e.code === 'Escape' && controlsOpen) {
        setControlsOpen(false);
      } else if (e.code === 'Escape' && aiPanelOpen) {
        setAiPanelOpen(false);
      } else if (
        isDead &&
        !activeCutscene &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        respawn();
      } else if (e.code.startsWith('Digit') && !blocked) {
        const slot = parseInt(e.code.replace('Digit', ''), 10);
        if (slot >= 1 && slot <= 4) {
          const s = useGameStore.getState();
          const owned = [
            'fists',
            ...s.inventory.filter((id) => weapons.some((w) => w.id === id)),
          ];
          const loadout = Array.from(new Set(owned));
          const pick = loadout[slot - 1];
          if (pick) {
            s.setCurrentWeaponId(pick);
            gameAudio.play('ui', 0.12);
          }
        }
      }
    };

    const handleMouseDown = () => {
      if (
        dialogueOpenRef.current ||
        marketOpenRef.current ||
        economyOpenRef.current ||
        socialOpenRef.current ||
        skillsOpenRef.current ||
        passOpenRef.current ||
        questOpenRef.current ||
        cutsceneRef.current ||
        controlsOpen ||
        shopOpen ||
        safehouseOpenRef.current ||
        aiPanelOpen ||
        drivingRef.current
      )
        return;
      if (!document.pointerLockElement) return;
      if (useGameStore.getState().playerStats.health <= 0) return;
      const st = useGameStore.getState();
      const weapon = st.getCurrentWeapon();
      const combat = st.playerStats.skills.combat;
      const now = Date.now();
      if (now - lastAttack.current < attackCooldownMs(weapon.fireRate)) return;
      lastAttack.current = now;

      // High-end damage pipeline: weapon → combat skill → passives → buffs → crit
      const mods = st.getModifiers();
      let base = scaleDamage(weapon.damage, combat);
      if (now < st.buffs.damageUntil)
        base = Math.round(base * st.buffs.damageMult);
      const nextHit = st.consumeNextHitMult();
      base = Math.round(base * nextHit);
      const { damage: rolled, crit } = applyCrit(base, mods);
      setLastCrit(crit);
      if (crit) window.setTimeout(() => setLastCrit(false), 400);

      const dmg = rolled;
      attackApi.current?.(dmg, weapon.range);

      // Boss / hunt with specialized multipliers
      const bossDmg = Math.round(
        dmg *
          mods.bossDamage *
          (now < st.buffs.pvpBossUntil ? st.buffs.pvpBossMult : 1)
      );
      bossAttackApi.current?.(bossDmg, weapon.range);
      huntAttackApi.current?.(Math.round(dmg * mods.huntDamage), weapon.range);
      gameAudio.play('hit', crit ? 0.35 : 0.22);

      // Open-world PvP
      const pos = playerPosRef.current;
      const zone = zoneAt(pos.x, pos.z);
      if (allowsPvp(zone, st.pvpEnabled)) {
        let best: OtherPlayer | null = null;
        let bestSq = weapon.range * weapon.range * 1.4;
        for (const o of otherPlayers) {
          if (o.health <= 0) continue;
          if (zone.kind === 'pve' && !o.pvp && !st.pvpEnabled) continue;
          const dx = o.position[0] - pos.x;
          const dz = o.position[2] - pos.z;
          const d = dx * dx + dz * dz;
          if (d < bestSq) {
            bestSq = d;
            best = o;
          }
        }
        if (best && pvpChannelRef.current) {
          const pvpDmg = Math.round(
            dmg *
              mods.pvpDamage *
              (now < st.buffs.pvpBossUntil ? st.buffs.pvpBossMult : 1)
          );
          pvpChannelRef.current.send({
            type: 'broadcast',
            event: 'pvp-hit',
            payload: {
              targetId: best.id,
              damage: pvpDmg,
              from: st.username,
            },
          });
          setOtherPlayers((prev) =>
            prev.map((o) =>
              o.id === best!.id
                ? { ...o, health: Math.max(0, o.health - pvpDmg) }
                : o
            )
          );
          if (best.health - pvpDmg <= 0) {
            st.registerPvpKill();
            st.updateStats({
              money: st.playerStats.money + 150,
              reputation: st.playerStats.reputation + 3,
            });
            gameAudio.play('kill', 0.4);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleMouseDown);
    };
    // Every piece of state the handlers read must be a dep — otherwise the
    // listeners keep a stale snapshot (e.g. controlsOpen stuck true blocked
    // firing forever after the controls card closed).
  }, [
    aiPanelOpen,
    shopOpen,
    otherPlayers,
    controlsOpen,
    pendingBrief,
    isDead,
    activeCutscene,
  ]);

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
            // MSAA off: SMAA in the post chain handles edges for a fraction
            // of the cost and works with the offscreen composer buffers.
            antialias: false,
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
            {/* Real image-based lighting from a CC0 night HDRI (Poly Haven),
                served locally from /public so there's no runtime CDN call.
                Lights ambient + metallic reflections; the neon colour pop
                comes from the emissive signs, point lights and bloom. */}
            <Environment
              files="/hdri/night_1k.hdr"
              resolution={256}
              background={false}
            />

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

            {/* Sprite atmosphere: rain, steam vents, crowd silhouettes,
                patrol drones. */}
            <AmbientVFX playerPosRef={playerPosRef} />

            {/* Rapier world: kinematic player capsule vs fixed ground +
                building cuboids. timeStep="vary" keeps physics in lockstep
                with useFrame so onUpdate/broadcast cadence is unchanged. */}
            <Physics timeStep="vary" gravity={[0, -25, 0]} colliders={false}>
              <StaticWorldColliders />
              <MMOPlayer
                key={spawnKey}
                playerId={playerId}
                onUpdate={handlePlayerUpdate}
                flashApi={playerFlashApi}
                staminaRef={staminaRef}
                tint={gameStore.character.appearance.tint}
                accent={gameStore.character.appearance.accent}
                accent2={gameStore.character.appearance.accent2}
                skinTone={gameStore.character.appearance.skinTone}
                gear={gameStore.character.appearance.gear}
                archetype={gameStore.character.archetype}
                bodyScale={gameStore.character.appearance.bodyScale}
                parts={gameStore.character.parts}
                drivingRef={drivingRef}
                externalPosRef={playerPosRef}
                deadRef={deadRef}
              />
            </Physics>

            <NPCManager
              playerPosRef={playerPosRef}
              onNearest={handleNearest}
              attackApi={attackApi}
              blipsRef={npcBlipsRef}
            />

            <HarvestNodes
              playerPosRef={playerPosRef}
              nearestRef={nearestHarvestRef}
              onNearest={setNearestHarvest}
              harvestApi={harvestApi}
            />

            <VehicleLayer
              playerPosRef={playerPosRef}
              playerRotRef={playerRotRef}
              vehicleState={vehicleState}
              nearestVehicleRef={nearestVehicleRef}
              onNearest={setNearestVehicle}
              enterApi={vehicleEnterApi}
              exitApi={vehicleExitApi}
              drivingRef={drivingRef}
              onDriverUpdate={handlePlayerUpdate}
              onDrivingChange={setIsDriving}
            />

            <ShopLayer
              playerPosRef={playerPosRef}
              nearestRef={nearestShopRef}
              onNearest={setNearestShop}
            />

            <SafehouseLayer
              playerPosRef={playerPosRef}
              nearRef={nearSafehouseRef}
              onNear={setNearSafehouse}
            />

            <FishingLayer
              playerPosRef={playerPosRef}
              nearestRef={nearestFishRef}
              onNearest={setNearestFish}
              castApi={castApi}
              fishingRef={fishingRef}
            />

            <BossLayer
              playerPosRef={playerPosRef}
              bossAttackApi={bossAttackApi}
            />

            <HuntLayer
              playerPosRef={playerPosRef}
              huntAttackApi={huntAttackApi}
            />

            {otherPlayers.map((player) => (
              <RemotePlayer key={player.id} player={player} />
            ))}

            {otherPlayers.length === 0 && <GhostLayer />}

            <ThirdPersonCamera
              targetRef={playerPosRef}
              rotationRef={playerRotRef}
              shakeRef={cameraShake}
            />

            {/* Compile every shader / upload every texture during the load
                gate instead of hitching on first sight. */}
            <Preload all />
          </Suspense>

          {/* Post-processing: SSAO grounds objects with contact shadows,
              bloom makes every emissive neon sign glow, subtle radial
              chromatic aberration + film grain read as a camera lens, the
              vignette deepens the noir mood, and SMAA resolves edges.
              ContextLossGuard unmounts the composer while the WebGL context
              is lost — addPass reads context attributes and crashes on a
              null context otherwise. */}
          <ContextLossGuard>
            <EffectComposer multisampling={0} enableNormalPass>
              <SSAO
                blendFunction={BlendFunction.MULTIPLY}
                samples={16}
                radius={0.08}
                intensity={18}
                luminanceInfluence={0.55}
                worldDistanceThreshold={24}
                worldDistanceFalloff={4}
                worldProximityThreshold={0.4}
                worldProximityFalloff={0.2}
              />
              <Bloom
                intensity={0.9}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                mipmapBlur
                radius={0.7}
                kernelSize={KernelSize.LARGE}
              />
              <ChromaticAberration
                offset={CA_OFFSET}
                radialModulation
                modulationOffset={0.5}
              />
              <Noise premultiply blendFunction={BlendFunction.SCREEN} />
              <Vignette offset={0.3} darkness={0.75} eskil={false} />
              <SMAA />
            </EffectComposer>
          </ContextLossGuard>
        </Canvas>
      </KeyboardControls>

      <LoadingScreen />

      <AtmosphereOverlay />

      {/* Live systems strip */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 font-mono flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border border-[#222428] bg-black/70 backdrop-blur-sm px-4 py-1.5 text-[10px] tracking-[0.18em] uppercase max-w-[90vw]">
        <span className="text-neutral-400">
          {gameStore.club ? `[${gameStore.club.tag}] ` : ''}
          {gameStore.username || 'Runner'}
        </span>
        <span style={{ color: getFaction(gameStore.factionId).color }}>
          {getFaction(gameStore.factionId).name}
        </span>
        <span className="text-neutral-500">{zoneLabel}</span>
        <span style={{ color: gameStore.pvpEnabled ? '#c03a30' : '#5a5d62' }}>
          {gameStore.pvpEnabled ? 'pvp armed' : 'pvp off'}
        </span>
        <span style={{ color: aiReady ? '#c03a30' : '#5a5d62' }}>
          {aiReady ? 'grok' : 'scripted'}
        </span>
        <span
          style={{
            color:
              SUPABASE_CONFIGURED && !isSupabaseRuntimeOffline()
                ? '#3f7d4e'
                : '#5a5d62',
          }}
        >
          {SUPABASE_CONFIGURED && !isSupabaseRuntimeOffline()
            ? `${otherPlayers.length + 1} online`
            : otherPlayers.length > 0
              ? `${otherPlayers.length + 1} online · local`
              : 'offline · ghosts'}
        </span>
        {muted && <span className="text-neutral-500">muted</span>}
      </div>

      <MMOHUD
        health={gameStore.playerStats.health}
        stamina={staminaRef.current}
        mana={100}
        level={
          gameStore.playerStats.level ||
          levelFromXp(gameStore.playerStats.xp || 0).level
        }
        experience={levelFromXp(gameStore.playerStats.xp || 0).xpIntoLevel}
        maxExperience={levelFromXp(gameStore.playerStats.xp || 0).xpForLevel}
        playersOnline={otherPlayers.length > 0 ? otherPlayers.length + 1 : 1}
        money={gameStore.playerStats.money}
        reputation={gameStore.playerStats.reputation}
        wanted={gameStore.playerStats.wanted}
        kills={gameStore.sessionStats.totalKills}
        weaponName={gameStore.getCurrentWeapon().name}
        weaponDamage={scaleDamage(
          gameStore.getCurrentWeapon().damage,
          gameStore.playerStats.skills.combat
        )}
        objectives={[
          ...buildStreetObjectives({
            talked: hasTalked,
            kills: gameStore.sessionStats.totalKills,
            money: gameStore.playerStats.money,
            reputation: gameStore.playerStats.reputation,
            hasWeapon:
              gameStore.currentWeaponId !== STARTER_WEAPON_ID ||
              gameStore.inventory.length > 0,
            combatSkill: gameStore.playerStats.skills.combat,
          }),
          ...(aiContract
            ? [
                (() => {
                  const p = contractProgress(aiContract, {
                    kills: gameStore.sessionStats.totalKills,
                    money: gameStore.playerStats.money,
                    talks: talkCount,
                    reputation: gameStore.playerStats.reputation,
                    wanted: gameStore.playerStats.wanted,
                  });
                  const tally =
                    aiContract.goal.kind === 'clear_heat'
                      ? p.done
                        ? 'clear'
                        : `heat ${p.current}`
                      : `${p.current}/${p.target}`;
                  return {
                    id: aiContract.id,
                    label: `${aiContract.title}: ${p.label} (${tally}) · $${aiContract.reward}`,
                    done: p.done,
                  };
                })(),
              ]
            : []),
        ]}
        playerPosRef={playerPosRef}
        playerRotRef={playerRotRef}
        otherPlayers={otherPlayers}
        staminaRef={staminaRef}
        npcBlipsRef={npcBlipsRef}
      />

      <MMOChat
        username={gameStore.username}
        playerId={gameStore.playerId || playerId}
        playerPosRef={playerPosRef}
        nearbyPlayers={otherPlayers.map((p) => ({
          id: p.id,
          username: p.username,
          position: p.position,
        }))}
      />

      {/* Single prompt stack — clears hotbar / chat collision. */}
      {!dialogueNpc &&
        !shopOpen &&
        !safehouseOpen &&
        !marketOpen &&
        !isDead &&
        !activeCutscene &&
        !controlsOpen && (
          <InteractPrompt
            items={[
              ...(isDriving
                ? [
                    {
                      id: 'drive',
                      keyLabel: 'f',
                      text: 'exit vehicle',
                    },
                  ]
                : []),
              ...(!isDriving && nearestNpc
                ? [
                    {
                      id: 'npc',
                      keyLabel: 'e',
                      text: `talk · ${nearestNpc.name}`,
                    },
                  ]
                : []),
              ...(!isDriving && nearestShop
                ? [
                    {
                      id: 'shop',
                      keyLabel: 'e',
                      text: `shop · ${nearestShop.name}`,
                    },
                  ]
                : []),
              ...(!isDriving && !nearestNpc && !nearestShop && nearSafehouse
                ? [
                    {
                      id: 'safehouse',
                      keyLabel: 'e',
                      text: `enter · ${SAFEHOUSE.name}`,
                    },
                  ]
                : []),
              ...(!isDriving && nearestHarvest
                ? [
                    {
                      id: 'harvest',
                      keyLabel: 'r',
                      text: `harvest · ${nearestHarvest.label}`,
                    },
                  ]
                : []),
              ...(!isDriving && nearestVehicle
                ? [
                    {
                      id: 'vehicle',
                      keyLabel: 'f',
                      text: `enter · ${nearestVehicle.label}`,
                    },
                  ]
                : []),
              ...(!isDriving && nearestFish
                ? [
                    {
                      id: 'fish',
                      keyLabel: 'c',
                      text: isFishing
                        ? 'fishing…'
                        : `cast · ${nearestFish.label}`,
                    },
                  ]
                : []),
            ].slice(0, 3)}
          />
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
          money={gameStore.playerStats.money}
          onChoose={handleChoose}
          onClose={closeDialogue}
        />
      )}

      {marketOpen && !isDead && <BlackMarket onClose={closeMarket} />}

      {economyOpen && !isDead && (
        <EconomyPanel
          onClose={() => {
            economyOpenRef.current = false;
            setEconomyOpen(false);
          }}
        />
      )}

      {socialOpen && (
        <SocialPanel
          onClose={() => {
            socialOpenRef.current = false;
            setSocialOpen(false);
          }}
          onFactionJoined={handleFactionJoined}
        />
      )}

      {questOpen && (
        <QuestLogPanel
          activeContract={aiContract}
          talkCount={talkCount}
          onClose={() => {
            questOpenRef.current = false;
            setQuestOpen(false);
          }}
        />
      )}

      {controlsOpen && (
        <ControlsCard
          onClose={() => {
            setControlsOpen(false);
            setTipsReady(true);
            // The card blocks input — restart the grace clock so the player
            // gets the full protection window once they can actually move.
            grantSpawnProtection();
          }}
        />
      )}

      {(() => {
        const tip = currentTip(tipsState);
        if (!tip || !tipsReady) return null;
        const hideCoach =
          Boolean(activeCutscene) ||
          controlsOpen ||
          skillsOpen ||
          passOpen ||
          questOpen ||
          leaderboardOpen ||
          socialOpen ||
          economyOpen ||
          marketOpen ||
          shopOpen ||
          safehouseOpen ||
          Boolean(dialogueNpc) ||
          Boolean(pendingBrief) ||
          isDead;
        return (
          <GuidedTips
            tip={tip}
            state={tipsState}
            onComplete={completeTip}
            onSkipTour={skipTipTour}
            hidden={hideCoach}
          />
        );
      })()}

      <KillFeed entries={killFeed} />

      {activeWorldEvent && (
        <WorldEventBanner
          event={WORLD_EVENTS[activeWorldEvent.kind]}
          startedAt={activeWorldEvent.startedAt}
          endsAt={activeWorldEvent.endsAt}
          hidden={
            skillsOpen ||
            passOpen ||
            questOpen ||
            leaderboardOpen ||
            socialOpen ||
            economyOpen ||
            Boolean(activeCutscene)
          }
        />
      )}

      {skillsOpen && (
        <SkillTreePanel
          onClose={() => {
            skillsOpenRef.current = false;
            setSkillsOpen(false);
          }}
        />
      )}

      {passOpen && (
        <PassPanel
          onClose={() => {
            passOpenRef.current = false;
            setPassOpen(false);
          }}
        />
      )}

      {leaderboardOpen && (
        <LeaderboardPanel
          onClose={() => {
            leaderboardOpenRef.current = false;
            setLeaderboardOpen(false);
          }}
        />
      )}

      {pendingBrief && (
        <MissionBriefing
          contract={pendingBrief}
          onAccept={acceptBrief}
          onDecline={declineBrief}
          accent={
            gameStore.factionId !== 'null'
              ? getFaction(gameStore.factionId).color
              : '#c03a30'
          }
          sourceLabel={
            gameStore.factionId !== 'null'
              ? getFaction(gameStore.factionId).name
              : 'street handler'
          }
        />
      )}

      {activeCutscene && (
        <CutscenePlayer
          script={activeCutscene}
          callsign={gameStore.username}
          compact
          zIndex={55}
          onComplete={() => {
            const was = activeCutscene.id;
            cutsceneRef.current = false;
            setActiveCutscene(null);
            // Cutscenes freeze the player; re-arm spawn grace on exit so the
            // 8s window counts from when control returns, not from mount.
            grantSpawnProtection();
            if (was === 'district_drop') {
              setZoneSplash({
                title: zoneLabel || 'Open Streets',
                sub: 'district online',
              });
              if (!hasSeenControlsCard()) setControlsOpen(true);
              else setTipsReady(true);
            }
            if (was === 'faction_join' && gameStore.factionId !== 'null') {
              const f = getFaction(gameStore.factionId);
              setZoneSplash({
                title: f.name,
                sub: 'allegiance locked',
              });
              pushFeed(`joined ${f.name}`, 'territory');
            }
          }}
        />
      )}

      {zoneSplash && !activeCutscene && (
        <LocationTitle
          title={zoneSplash.title}
          subtitle={zoneSplash.sub}
          onDone={() => setZoneSplash(null)}
        />
      )}

      {shopOpen && nearestShop && (
        <ShopUI shop={nearestShop} onClose={() => setShopOpen(false)} />
      )}

      {safehouseOpen && !isDead && (
        <SafehousePanel
          onClose={() => {
            safehouseOpenRef.current = false;
            setSafehouseOpen(false);
          }}
        />
      )}

      <AIConfigPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        onConfigChange={() => setAiReady(llmClient.isConfigured())}
      />

      {aiContract &&
        !activeCutscene &&
        (() => {
          const p = contractProgress(aiContract, {
            kills: gameStore.sessionStats.totalKills,
            money: gameStore.playerStats.money,
            talks: talkCount,
            reputation: gameStore.playerStats.reputation,
            wanted: gameStore.playerStats.wanted,
          });
          const pct =
            p.target > 0
              ? Math.min(100, Math.round((p.current / p.target) * 100))
              : p.done
                ? 100
                : 0;
          return (
            <div className="absolute bottom-[13.5rem] right-4 z-20 w-64 max-w-[40vw] font-mono border border-[#222428] bg-black/80 backdrop-blur-sm p-3 text-[11px] text-neutral-300">
              <div className="text-[10px] tracking-[0.28em] uppercase text-[#c03a30] mb-1">
                {aiConfigured() ? 'grok' : 'street'} job ·{' '}
                {aiContract.difficulty}
              </div>
              <div className="text-neutral-100 tracking-[0.08em] uppercase mb-1">
                {aiContract.title}
              </div>
              <div className="mb-2 text-[10px] tracking-[0.12em] uppercase text-neutral-400">
                {p.label} · {p.current}/{p.target || 0}
              </div>
              <div
                className="h-[2px] w-full mb-2"
                style={{ background: '#1f1f22' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: COLORS.accent }}
                />
              </div>
              <div className="flex justify-between text-[10px] tracking-[0.15em] uppercase text-neutral-500">
                <span>${aiContract.reward}</span>
                <button
                  onClick={() => setAiContract(null)}
                  className="hover:text-neutral-200"
                >
                  abandon
                </button>
              </div>
            </div>
          );
        })()}

      {aiContractLoading && (
        <div className="absolute bottom-[13.5rem] right-4 z-20 font-mono border border-[#222428] bg-black/80 px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-neutral-500">
          writing job…
        </div>
      )}

      {contractToast && (
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 z-[28] font-mono border border-[#c03a30] bg-black/90 px-6 py-3 text-[12px] tracking-[0.22em] uppercase text-neutral-100">
          contract complete · {contractToast}
        </div>
      )}

      {gameStore.xpToast && Date.now() - gameStore.xpToast.at < 2200 && (
        <div className="absolute top-28 left-4 z-[28] font-mono border border-[#c9a15a] bg-black/85 px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-[#c9a15a]">
          +{gameStore.xpToast.amount} xp · {gameStore.xpToast.source}
        </div>
      )}

      {levelUpFlash != null && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 font-mono border border-[#c03a30] bg-black/90 px-8 py-4 text-center">
          <div className="text-[10px] tracking-[0.4em] uppercase text-neutral-500">
            iron haven
          </div>
          <div
            className="mt-1 text-2xl tracking-[0.25em] uppercase"
            style={{ color: '#c03a30' }}
          >
            level {levelUpFlash}
          </div>
          <div className="mt-1 text-[10px] tracking-[0.2em] uppercase text-neutral-400">
            +skill points · press k · max vitality up
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-200"
        style={{
          opacity: hitVignette ? 1 : 0,
          background:
            'radial-gradient(circle, transparent 45%, rgba(192,58,48,0.55) 100%)',
        }}
      />

      {isDead && !activeCutscene && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 font-mono"
          onKeyDown={(e) => {
            if (e.code === 'Enter' || e.code === 'Space') respawn();
          }}
        >
          <div className="text-[12px] tracking-[0.4em] uppercase text-neutral-500">
            iron haven
          </div>
          <div
            className="mt-3 text-4xl tracking-[0.3em] uppercase"
            style={{ color: COLORS.accent }}
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
            autoFocus
            onClick={respawn}
            className="mt-8 border border-[#222428] px-8 py-3 text-[11px] tracking-[0.28em] uppercase text-neutral-200 hover:bg-[#15171a] transition-colors"
          >
            respawn · enter
          </button>
        </div>
      )}

      {/* Pass strip — under minimap (minimap owns top-right). */}
      {!activeCutscene && (
        <button
          type="button"
          onClick={() => {
            passOpenRef.current = true;
            setPassOpen(true);
            if (document.pointerLockElement) document.exitPointerLock();
            gameAudio.play('ui', 0.12);
          }}
          className="absolute top-[15.75rem] right-4 z-20 font-mono border px-3 py-2 text-left hover:brightness-110 transition w-[min(220px,40vw)]"
          style={{
            borderColor: passIsLive(gameStore.pass) ? COLORS.gold : '#222428',
            background: 'rgba(0,0,0,0.72)',
          }}
        >
          <div
            className="text-[9px] tracking-[0.3em] uppercase"
            style={{
              color: passIsLive(gameStore.pass) ? COLORS.gold : '#5a5d62',
            }}
          >
            {passIsLive(gameStore.pass) ? 'pass · vip' : 'iron haven pass'}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-neutral-400 mt-0.5">
            {passIsLive(gameStore.pass)
              ? `${formatPassRemaining(gameStore.pass)} left · o`
              : '$1.99/wk · o'}
          </div>
        </button>
      )}

      {/* Compact help — auto-hides once player dismisses or opens a panel. */}
      {!helpDismissed &&
        !activeCutscene &&
        !controlsOpen &&
        !skillsOpen &&
        !passOpen &&
        !questOpen &&
        !socialOpen &&
        !economyOpen &&
        !marketOpen &&
        !shopOpen &&
        !dialogueNpc &&
        !isDead && (
          <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-20 font-mono border border-[#222428] bg-black/65 backdrop-blur-sm px-4 py-2 text-center max-w-[92vw]">
            <div className="text-[10px] tracking-[0.16em] uppercase text-neutral-400">
              <span style={{ color: COLORS.accent }}>wasd</span> move ·{' '}
              <span style={{ color: COLORS.accent }}>e</span> talk ·{' '}
              <span style={{ color: COLORS.accent }}>j</span> job ·{' '}
              <span style={{ color: COLORS.accent }}>l</span> log ·{' '}
              <span style={{ color: COLORS.accent }}>k</span> skills ·{' '}
              <span style={{ color: COLORS.gold }}>o</span> pass
            </div>
            <button
              type="button"
              onClick={() => setHelpDismissed(true)}
              className="mt-1 text-[8px] tracking-[0.25em] uppercase text-neutral-600 hover:text-neutral-400"
            >
              hide help
            </button>
          </div>
        )}

      {/* Ability hotbar + weapon hint + SP */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 font-mono flex items-end gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={`w${n}`}
            className="relative w-10 h-12 border border-[#222428] bg-black/70 flex flex-col items-center justify-center"
            title="Weapon slot"
          >
            <span className="text-[8px] text-neutral-600">{n}</span>
            <span className="text-[7px] tracking-[0.1em] uppercase text-neutral-500">
              arm
            </span>
          </div>
        ))}
        <div className="w-px h-10 bg-[#222428] mx-0.5" />
        {gameStore.abilityBar.map((id, i) => {
          const def = id ? ACTIVE_ABILITIES[id] : null;
          const readyAt = id ? gameStore.abilityCooldowns[id] || 0 : 0;
          const cdLeft = Math.max(0, readyAt - Date.now());
          const onCd = cdLeft > 0;
          return (
            <div
              key={i}
              className="relative w-14 h-14 border flex flex-col items-center justify-center"
              style={{
                borderColor: def && !onCd ? def.color : '#222428',
                background: 'rgba(0,0,0,0.75)',
              }}
            >
              <span
                className="text-[8px] tracking-[0.15em] uppercase text-center px-0.5 leading-tight"
                style={{ color: def ? def.color : '#444' }}
              >
                {def ? def.name.split(' ')[0] : '—'}
              </span>
              <span className="absolute top-0.5 right-1 text-[8px] text-neutral-600">
                {i + 5}
              </span>
              {onCd && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] text-neutral-400">
                  {Math.ceil(cdLeft / 1000)}
                </div>
              )}
            </div>
          );
        })}
        {gameStore.playerStats.skillPoints > 0 && (
          <button
            onClick={() => {
              skillsOpenRef.current = true;
              openedSkillsRef.current = true;
              setSkillsOpen(true);
              if (document.pointerLockElement) document.exitPointerLock();
            }}
            className="ml-2 border border-[#c03a30] bg-[#c03a30]/15 px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-[#c03a30] animate-pulse"
          >
            {gameStore.playerStats.skillPoints} sp · k
          </button>
        )}
      </div>

      {(abilityFlash || lastCrit) && (
        <div
          className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[28] pointer-events-none font-mono text-[14px] tracking-[0.3em] uppercase"
          style={{ color: lastCrit ? COLORS.gold : COLORS.accent }}
        >
          {lastCrit ? 'critical' : abilityFlash}
        </div>
      )}
    </div>
  );
};

export default MMOGame;
