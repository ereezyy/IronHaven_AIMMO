import { create } from 'zustand';
import { weapons, Weapon } from '../components/WeaponSystem';
import { persistenceService } from '../lib/persistence';
import {
  CharacterBuild,
  defaultBuild,
  loadBuild,
  resolveSkills,
  ARCHETYPES,
  saveBuild,
} from '../game/character';
import {
  emptyBag,
  ResourceBag,
  ResourceId,
  applyHarvest,
  applyCraft,
  canCraft,
  tradeBuy,
  tradeSell,
  Recipe,
  RECIPES,
} from '../game/economy';
import {
  FactionId,
  FactionStanding,
  emptyStanding,
  getFaction,
} from '../game/factions';
import {
  Club,
  createClub,
  leaveClub,
  loadLocalClub,
  saveLocalClub,
} from '../game/clubs';
import { FishBag, FishId, emptyFishBag, sellAllFish } from '../game/fishing';
import {
  levelFromXp,
  scaledXp,
  maxHealthForLevel,
  type XpSource,
} from '../game/progression';
import {
  SkillRanks,
  emptyRanks,
  canRankUp,
  computeModifiers,
  unlockedActives,
  skillPointsOnLevel,
  ACTIVE_ABILITIES,
  getNode,
  type ActiveAbilityId,
  type SkillModifiers,
} from '../game/skills';
import {
  type PassPersisted,
  EMPTY_PASS,
  PASS_BENEFITS,
  loadPassFromStorage,
  savePassToStorage,
  isPassActive,
  activatePassPeriod,
  canClaimWeeklySp,
  markWeeklySpClaimed,
  applyPassXp,
  beginCheckout,
} from '../game/subscription';
import {
  type BoardState,
  type BoardCounters,
  type DailyJob,
  generateBoard,
  refreshProgress,
  isJobComplete,
  loadPersistedBoard,
  savePersistedBoard,
  emptyCounters,
  utcDayKey,
  utcWeekKey,
} from '../game/dailyBoard';
import {
  type TerritoryState,
  emptyTerritory,
  controlBonus,
} from '../game/territory';
import {
  saveProgressSnapshot,
  loadProgressSnapshot,
  type ProgressSnapshot,
} from '../game/progressSave';

interface GameState {
  playerStats: {
    health: number;
    reputation: number;
    wanted: number;
    money: number;
    policeKillCount: number;
    /** Lifetime experience points. */
    xp: number;
    level: number;
    /** Unspent skill points. */
    skillPoints: number;
    skills: {
      combat: number;
      stealth: number;
      driving: number;
      intimidation: number;
    };
  };
  /** Rank per skill node id. */
  skillRanks: SkillRanks;
  /** Equipped active abilities (hotbar Q/E/R/F or 5-8). */
  abilityBar: (ActiveAbilityId | null)[];
  /** abilityId → ready-at timestamp. */
  abilityCooldowns: Record<string, number>;
  /** Temporary buffs from actives. */
  buffs: {
    damageUntil: number;
    damageMult: number;
    nextHitMult: number;
    nextHitUntil: number;
    driveUntil: number;
    driveMult: number;
    pvpBossUntil: number;
    pvpBossMult: number;
    harvestDoubleUntil: number;
    xpKillUntil: number;
    xpKillMult: number;
  };
  inventory: string[];
  /** Crafting materials / trade goods. */
  bag: ResourceBag;
  fishBag: FishBag;
  recentActions: string[];
  activeMission: any;
  currentWeaponId: string;
  playerPosition: [number, number, number];
  playerId: string | null;
  username: string;
  character: CharacterBuild;
  factionId: FactionId;
  factionStanding: FactionStanding;
  club: Club | null;
  /** Open-world PvP flag (also forced on in PvP zones). */
  pvpEnabled: boolean;
  sessionStats: {
    totalKills: number;
    totalMoneyEarned: number;
    maxWantedLevel: number;
    pvpKills: number;
    bossKills: number;
    huntKills: number;
    xpGained: number;
  };
  /** Last XP popup payload for HUD toast. */
  xpToast: { amount: number; source: string; at: number } | null;
  /** Iron Haven Pass ($1.99/wk) subscription state. */
  pass: PassPersisted;
  /** Daily / weekly board. */
  dailyBoard: BoardState;
  boardCounters: BoardCounters;
  boardClaimed: string[];
  /** Faction territory control map. */
  territory: TerritoryState;
  getCurrentWeapon: () => Weapon;
  syncDailyBoard: () => void;
  claimDailyJob: (jobId: string) => {
    ok: boolean;
    message: string;
    money?: number;
    xp?: number;
    sp?: number;
  };
  noteBoardEvent: (
    kind:
      | 'hunt'
      | 'kill'
      | 'talk'
      | 'harvest'
      | 'fish'
      | 'faction'
      | 'money'
  ) => void;
  setTerritory: (t: TerritoryState) => void;
  applyBossLoot: (loot: {
    money: number;
    rep: number;
    scrap?: number;
    circuits?: number;
    chems?: number;
  }) => void;
  addAction: (action: string) => void;
  updateStats: (stats: Partial<GameState['playerStats']>) => void;
  /** Award XP (optionally override base). Returns amount granted. */
  gainXp: (source: XpSource, baseOverride?: number) => number;
  getModifiers: () => SkillModifiers;
  /** True when Pass is within active period. */
  isPassActive: () => boolean;
  /** Stripe Checkout if configured, else demo-activate a week. */
  subscribePass: (mode?: 'auto' | 'demo' | 'stripe') => {
    ok: boolean;
    path: 'stripe' | 'demo';
    message: string;
  };
  /** Grant weekly Pass skill points (once per ISO week). */
  claimPassWeeklySp: () => { ok: boolean; message: string; amount?: number };
  /** Clear Pass (dev / cancel demo). */
  cancelPass: () => void;
  rankSkill: (nodeId: string) => boolean;
  equipAbility: (slot: number, id: ActiveAbilityId | null) => void;
  castAbility: (id: ActiveAbilityId) => { ok: boolean; message?: string };
  consumeNextHitMult: () => number;
  isBuffActive: (key: keyof GameState['buffs']) => boolean;
  incrementPoliceKillCount: () => void;
  addInventoryItem: (item: string) => void;
  setActiveMission: (mission: any) => void;
  updateSkills: (
    skillUpdates: Partial<GameState['playerStats']['skills']>
  ) => void;
  setCurrentWeaponId: (weaponId: string) => void;
  setPlayerPosition: (position: [number, number, number]) => void;
  setUsername: (username: string) => void;
  applyCharacter: (build: CharacterBuild) => void;
  harvestIntoBag: (yields: Partial<ResourceBag>) => void;
  craftRecipe: (recipeId: string) => boolean;
  buyResource: (id: ResourceId, qty?: number) => boolean;
  sellResource: (id: ResourceId, qty?: number) => boolean;
  useStim: () => boolean;
  joinFaction: (id: FactionId) => void;
  leaveFaction: () => void;
  adjustFactionStanding: (id: FactionId, delta: number) => void;
  createPlayerClub: (name: string, tag: string, motto?: string) => void;
  setClub: (club: Club | null) => void;
  leavePlayerClub: () => void;
  setPvpEnabled: (on: boolean) => void;
  addFish: (id: FishId) => void;
  sellFish: () => number;
  registerPvpKill: () => void;
  registerBossKill: () => void;
  registerHuntKill: () => void;
  clearXpToast: () => void;
  initializePlayer: (username?: string) => Promise<void>;
  saveGameState: () => Promise<void>;
  loadGameState: (playerId: string) => Promise<void>;
}

const initialPass = (() => {
  try {
    return loadPassFromStorage();
  } catch {
    return { ...EMPTY_PASS };
  }
})();

function buildInitialBoard(): {
  dailyBoard: BoardState;
  boardCounters: BoardCounters;
  boardClaimed: string[];
} {
  const board = generateBoard();
  const persisted = loadPersistedBoard();
  if (
    persisted &&
    persisted.dayKey === board.dayKey &&
    persisted.weekKey === board.weekKey
  ) {
    const claimed = new Set(persisted.claimedIds);
    return {
      dailyBoard: {
        ...board,
        dailies: board.dailies.map((j) =>
          claimed.has(j.id) ? { ...j, claimed: true } : j
        ),
        weekly: claimed.has(board.weekly.id)
          ? { ...board.weekly, claimed: true }
          : board.weekly,
      },
      boardCounters: emptyCounters(),
      boardClaimed: persisted.claimedIds,
    };
  }
  savePersistedBoard({
    dayKey: board.dayKey,
    weekKey: board.weekKey,
    claimedIds: [],
    baseline: emptyCounters(),
  });
  return {
    dailyBoard: board,
    boardCounters: emptyCounters(),
    boardClaimed: [],
  };
}

const initialBoard = buildInitialBoard();

const persistedBuild = (() => {
  try {
    return loadBuild();
  } catch {
    return null;
  }
})();

export const useGameStore = create<GameState>((set, get) => ({
  playerStats: {
    health: 100,
    reputation: 0,
    wanted: 0,
    money: 1000,
    policeKillCount: 0,
    xp: 0,
    level: 1,
    skillPoints: 1,
    skills: {
      combat: 10,
      stealth: 10,
      driving: 10,
      intimidation: 10,
    },
  },
  skillRanks: emptyRanks(),
  abilityBar: [null, null, null, null],
  abilityCooldowns: {},
  buffs: {
    damageUntil: 0,
    damageMult: 1,
    nextHitMult: 1,
    nextHitUntil: 0,
    driveUntil: 0,
    driveMult: 1,
    pvpBossUntil: 0,
    pvpBossMult: 1,
    harvestDoubleUntil: 0,
    xpKillUntil: 0,
    xpKillMult: 1,
  },
  inventory: [],
  bag: emptyBag(),
  fishBag: emptyFishBag(),
  recentActions: [],
  activeMission: null,
  currentWeaponId: 'fists',
  playerPosition: [0, 1.5, 0],
  playerId: null,
  username: persistedBuild?.callsign || 'Runner',
  character: persistedBuild || defaultBuild('Runner'),
  factionId: 'null',
  factionStanding: emptyStanding(),
  club: loadLocalClub(),
  pvpEnabled: false,
  pass: initialPass,
  dailyBoard: initialBoard.dailyBoard,
  boardCounters: initialBoard.boardCounters,
  boardClaimed: initialBoard.boardClaimed,
  territory: emptyTerritory(),
  xpToast: null,
  sessionStats: {
    totalKills: 0,
    totalMoneyEarned: 0,
    maxWantedLevel: 0,
    pvpKills: 0,
    bossKills: 0,
    huntKills: 0,
    xpGained: 0,
  },
  getCurrentWeapon: () => {
    const state = get();
    return weapons.find((w) => w.id === state.currentWeaponId) || weapons[0];
  },
  addAction: (action) =>
    set((state) => ({
      recentActions: [...state.recentActions.slice(-8), action],
    })),
  updateStats: (stats) => {
    set((state) => {
      const newStats = { ...state.playerStats, ...stats };
      const newSessionStats = { ...state.sessionStats };

      if (
        stats.wanted !== undefined &&
        stats.wanted > newSessionStats.maxWantedLevel
      ) {
        newSessionStats.maxWantedLevel = stats.wanted;
      }

      if (stats.money !== undefined) {
        const moneyEarned = stats.money - state.playerStats.money;
        if (moneyEarned > 0) {
          newSessionStats.totalMoneyEarned += moneyEarned;
        }
      }

      return {
        playerStats: newStats,
        sessionStats: newSessionStats,
      };
    });

    get().saveGameState();
  },
  getModifiers: () => {
    const base = computeModifiers(get().skillRanks);
    const bonus = controlBonus(get().territory, get().factionId);
    return {
      ...base,
      shopDiscount: Math.min(0.45, base.shopDiscount + bonus.shopDiscount),
      xpBonus: base.xpBonus * bonus.xpMult,
    };
  },
  setTerritory: (t) => set({ territory: t }),
  syncDailyBoard: () => {
    const day = utcDayKey();
    const week = utcWeekKey();
    const s = get();
    if (s.dailyBoard.dayKey !== day || s.dailyBoard.weekKey !== week) {
      const board = generateBoard();
      set({
        dailyBoard: board,
        boardCounters: emptyCounters(),
        boardClaimed: [],
      });
      savePersistedBoard({
        dayKey: day,
        weekKey: week,
        claimedIds: [],
        baseline: emptyCounters(),
      });
      return;
    }
    const refreshed = refreshProgress(s.dailyBoard, s.boardCounters);
    // Preserve claimed flags
    const claimed = new Set(s.boardClaimed);
    set({
      dailyBoard: {
        ...refreshed,
        dailies: refreshed.dailies.map((j) =>
          claimed.has(j.id) ? { ...j, claimed: true } : j
        ),
        weekly: claimed.has(refreshed.weekly.id)
          ? { ...refreshed.weekly, claimed: true }
          : refreshed.weekly,
      },
    });
  },
  noteBoardEvent: (kind) => {
    const s = get();
    const c = { ...s.boardCounters };
    if (kind === 'hunt') c.huntKills = s.sessionStats.huntKills;
    if (kind === 'kill') c.totalKills = s.sessionStats.totalKills;
    if (kind === 'talk') c.talks += 1;
    if (kind === 'harvest') c.harvests += 1;
    if (kind === 'fish') c.fishCaught += 1;
    if (kind === 'faction') c.factionJoined = 1;
    if (kind === 'money') c.moneyEarned = s.sessionStats.totalMoneyEarned;
    // Always refresh kill/hunt/money from session so board stays accurate.
    c.huntKills = s.sessionStats.huntKills;
    c.totalKills = s.sessionStats.totalKills;
    c.moneyEarned = s.sessionStats.totalMoneyEarned;
    set({ boardCounters: c });
    get().syncDailyBoard();
  },
  claimDailyJob: (jobId) => {
    const s = get();
    const jobs: DailyJob[] = [...s.dailyBoard.dailies, s.dailyBoard.weekly];
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { ok: false, message: 'Job not found.' };
    if (job.claimed || s.boardClaimed.includes(jobId))
      return { ok: false, message: 'Already claimed.' };
    if (!isJobComplete(job))
      return { ok: false, message: 'Objectives incomplete.' };
    const claimed = [...s.boardClaimed, jobId];
    const mark = (j: DailyJob) =>
      j.id === jobId ? { ...j, claimed: true } : j;
    set({
      boardClaimed: claimed,
      dailyBoard: {
        ...s.dailyBoard,
        dailies: s.dailyBoard.dailies.map(mark),
        weekly: mark(s.dailyBoard.weekly),
      },
      playerStats: {
        ...s.playerStats,
        money: s.playerStats.money + job.rewardMoney,
        skillPoints: s.playerStats.skillPoints + job.rewardSp,
      },
    });
    if (job.rewardXp > 0) get().gainXp('contract', job.rewardXp);
    savePersistedBoard({
      dayKey: s.dailyBoard.dayKey,
      weekKey: s.dailyBoard.weekKey,
      claimedIds: claimed,
      baseline: emptyCounters(),
    });
    get().addAction(`daily_claim_${jobId}`);
    return {
      ok: true,
      message: `Claimed +$${job.rewardMoney}`,
      money: job.rewardMoney,
      xp: job.rewardXp,
      sp: job.rewardSp,
    };
  },
  applyBossLoot: (loot) => {
    const s = get();
    const bag = { ...s.bag };
    if (loot.scrap) bag.scrap = (bag.scrap || 0) + loot.scrap;
    if (loot.circuits) bag.circuits = (bag.circuits || 0) + loot.circuits;
    if (loot.chems) bag.chems = (bag.chems || 0) + loot.chems;
    set({
      bag,
      playerStats: {
        ...s.playerStats,
        money: s.playerStats.money + loot.money,
        reputation: s.playerStats.reputation + loot.rep,
      },
    });
    get().addAction('boss_loot');
  },
  isPassActive: () => isPassActive(get().pass),
  subscribePass: (mode = 'auto') => {
    const path =
      mode === 'demo'
        ? 'demo'
        : mode === 'stripe'
          ? beginCheckout() === 'stripe'
            ? 'stripe'
            : 'demo'
          : beginCheckout();
    // Demo (and local restore after Stripe handoff) activates immediately.
    // Real Stripe webhooks would set expiry server-side; until then demo
    // still grants a full week so benefits are playable offline.
    if (path === 'demo' || mode === 'demo') {
      const next = activatePassPeriod(get().pass, 'demo');
      savePassToStorage(next);
      set({ pass: next });
      get().addAction('pass_activated');
      return {
        ok: true,
        path: 'demo',
        message: 'Iron Haven Pass active for 7 days (demo).',
      };
    }
    // Stripe tab opened — also seed a provisional week so the player
    // isn't stuck waiting on a webhook during local/dev.
    const next = activatePassPeriod(get().pass, 'stripe');
    savePassToStorage(next);
    set({ pass: next });
    get().addAction('pass_stripe');
    return {
      ok: true,
      path: 'stripe',
      message: 'Stripe Checkout opened — Pass provisionally active for 7 days.',
    };
  },
  claimPassWeeklySp: () => {
    const s = get();
    if (!isPassActive(s.pass)) {
      return { ok: false, message: 'Pass not active.' };
    }
    if (!canClaimWeeklySp(s.pass)) {
      return { ok: false, message: 'Weekly skill points already claimed.' };
    }
    const amount = PASS_BENEFITS.weeklySkillPoints;
    const next = markWeeklySpClaimed(s.pass);
    savePassToStorage(next);
    set({
      pass: next,
      playerStats: {
        ...s.playerStats,
        skillPoints: s.playerStats.skillPoints + amount,
      },
    });
    get().addAction('pass_weekly_sp');
    return {
      ok: true,
      amount,
      message: `+${amount} skill points from Iron Haven Pass.`,
    };
  },
  cancelPass: () => {
    const next = { ...EMPTY_PASS };
    savePassToStorage(next);
    set({ pass: next });
    get().addAction('pass_cancelled');
  },
  gainXp: (source, baseOverride) => {
    const state = get();
    const mods = get().getModifiers();
    let amount = scaledXp(source, state.playerStats.level, baseOverride);
    amount = Math.round(amount * mods.xpBonus);
    // Iron Haven Pass XP boost (stacks after skills).
    amount = applyPassXp(amount, isPassActive(state.pass));
    // Focus Lock buff
    const now = Date.now();
    if (
      now < state.buffs.xpKillUntil &&
      (source === 'hunt' ||
        source === 'npc_kill' ||
        source === 'boss' ||
        source === 'pvp')
    ) {
      amount = Math.round(amount * state.buffs.xpKillMult);
    }
    if (amount <= 0) return 0;
    const prevLevel = state.playerStats.level;
    const newXp = state.playerStats.xp + amount;
    const info = levelFromXp(newXp);
    const leveled = info.level > prevLevel;
    const spGain = leveled
      ? skillPointsOnLevel(prevLevel, info.level)
      : 0;
    const modHp = mods.maxHealth;
    set({
      playerStats: {
        ...state.playerStats,
        xp: newXp,
        level: info.level,
        skillPoints: state.playerStats.skillPoints + spGain,
        health: leveled
          ? Math.min(
              maxHealthForLevel(info.level) + modHp,
              state.playerStats.health + 25 + (info.level - prevLevel) * 12
            )
          : state.playerStats.health,
      },
      sessionStats: {
        ...state.sessionStats,
        xpGained: state.sessionStats.xpGained + amount,
      },
      xpToast: { amount, source, at: Date.now() },
    });
    if (leveled) get().addAction(`level_${info.level}`);
    get().saveGameState();
    return amount;
  },
  rankSkill: (nodeId) => {
    const s = get();
    const check = canRankUp(
      s.skillRanks,
      nodeId,
      s.playerStats.skillPoints,
      s.playerStats.level
    );
    if (!check.ok) return false;
    const node = getNode(nodeId);
    if (!node) return false;
    const ranks = { ...s.skillRanks, [nodeId]: (s.skillRanks[nodeId] || 0) + 1 };
    const abilityBar = [...s.abilityBar] as (ActiveAbilityId | null)[];
    if (node.unlocksActive && ranks[nodeId] === 1) {
      const empty = abilityBar.findIndex((a) => a === null);
      if (empty >= 0) abilityBar[empty] = node.unlocksActive;
      else if (!abilityBar.includes(node.unlocksActive)) {
        // leave bar as-is; player equips from UI
      }
    }
    // Mirror core stats for legacy systems (combat skill used by scaleDamage baseline).
    const mods = computeModifiers(ranks);
    set({
      skillRanks: ranks,
      abilityBar,
      playerStats: {
        ...s.playerStats,
        skillPoints: s.playerStats.skillPoints - node.cost,
        skills: {
          ...s.playerStats.skills,
          combat: Math.round(10 + (mods.damage - 1) * 50),
          stealth: Math.round(10 + mods.shopDiscount * 40 + mods.wantedDecay * 10),
          driving: Math.round(10 + (mods.driveSpeed - 1) * 40),
          intimidation: Math.round(10 + mods.critChance * 30),
        },
      },
    });
    get().addAction(`skill_${nodeId}`);
    get().saveGameState();
    return true;
  },
  equipAbility: (slot, id) => {
    if (slot < 0 || slot > 3) return;
    if (id) {
      const unlocked = unlockedActives(get().skillRanks);
      if (!unlocked.includes(id)) return;
    }
    const bar = [...get().abilityBar] as (ActiveAbilityId | null)[];
    bar[slot] = id;
    set({ abilityBar: bar });
  },
  castAbility: (id) => {
    const s = get();
    const unlocked = unlockedActives(s.skillRanks);
    if (!unlocked.includes(id)) return { ok: false, message: 'Not unlocked' };
    const def = ACTIVE_ABILITIES[id];
    const mods = computeModifiers(s.skillRanks);
    const now = Date.now();
    const cd = Math.round(def.cooldownMs * mods.cooldown);
    const readyAt = s.abilityCooldowns[id] || 0;
    if (now < readyAt) {
      return {
        ok: false,
        message: `Cooldown ${Math.ceil((readyAt - now) / 1000)}s`,
      };
    }
    const buffs = { ...s.buffs };
    let health = s.playerStats.health;
    let wanted = s.playerStats.wanted;

    switch (id) {
      case 'adrenaline':
        buffs.damageUntil = now + def.durationMs;
        buffs.damageMult = 1.35;
        break;
      case 'shadow_strike':
        buffs.nextHitMult = 2.2;
        buffs.nextHitUntil = now + def.durationMs;
        break;
      case 'smoke_veil':
        wanted = Math.max(0, wanted - 1);
        break;
      case 'overdrive':
        buffs.driveUntil = now + def.durationMs;
        buffs.driveMult = 1.4;
        break;
      case 'field_patch': {
        const maxHp =
          maxHealthForLevel(s.playerStats.level) + mods.maxHealth;
        health = Math.min(maxHp, health + Math.round(maxHp * 0.35));
        break;
      }
      case 'blood_mark':
        buffs.pvpBossUntil = now + def.durationMs;
        buffs.pvpBossMult = 1.25;
        break;
      case 'scavenger_pulse':
        buffs.harvestDoubleUntil = now + def.durationMs;
        break;
      case 'focus_lock':
        buffs.xpKillUntil = now + def.durationMs;
        buffs.xpKillMult = 1.5;
        break;
    }

    set({
      buffs,
      abilityCooldowns: { ...s.abilityCooldowns, [id]: now + cd },
      playerStats: {
        ...s.playerStats,
        health,
        wanted,
      },
    });
    get().addAction(`cast_${id}`);
    return { ok: true };
  },
  consumeNextHitMult: () => {
    const s = get();
    const now = Date.now();
    if (now < s.buffs.nextHitUntil && s.buffs.nextHitMult > 1) {
      const m = s.buffs.nextHitMult;
      set({
        buffs: { ...s.buffs, nextHitMult: 1, nextHitUntil: 0 },
      });
      return m;
    }
    return 1;
  },
  isBuffActive: (key) => {
    const b = get().buffs;
    const now = Date.now();
    if (key === 'damageUntil') return now < b.damageUntil;
    if (key === 'driveUntil') return now < b.driveUntil;
    if (key === 'pvpBossUntil') return now < b.pvpBossUntil;
    if (key === 'harvestDoubleUntil') return now < b.harvestDoubleUntil;
    if (key === 'xpKillUntil') return now < b.xpKillUntil;
    if (key === 'nextHitUntil') return now < b.nextHitUntil;
    return false;
  },
  incrementPoliceKillCount: () => {
    set((state) => ({
      playerStats: {
        ...state.playerStats,
        policeKillCount: state.playerStats.policeKillCount + 1,
      },
      sessionStats: {
        ...state.sessionStats,
        totalKills: state.sessionStats.totalKills + 1,
      },
    }));
    get().gainXp('npc_kill');
    get().saveGameState();
  },
  addInventoryItem: (item) => {
    set((state) => ({
      inventory: state.inventory.includes(item)
        ? state.inventory
        : [...state.inventory, item],
    }));

    get().saveGameState();
  },
  setActiveMission: (mission) =>
    set(() => ({
      activeMission: mission,
    })),
  updateSkills: (skillUpdates) => {
    set((state) => ({
      playerStats: {
        ...state.playerStats,
        skills: { ...state.playerStats.skills, ...skillUpdates },
      },
    }));

    get().saveGameState();
  },
  setCurrentWeaponId: (weaponId) => {
    set(() => ({
      currentWeaponId: weaponId,
    }));

    get().saveGameState();
  },
  setPlayerPosition: (position) =>
    set(() => ({
      playerPosition: position,
    })),
  setUsername: (username) => {
    const clean = username.trim().slice(0, 20) || 'Runner';
    try {
      localStorage.setItem('ironhaven-username', clean);
    } catch {
      /* ignore */
    }
    set((s) => ({
      username: clean,
      character: { ...s.character, callsign: clean },
    }));
  },
  applyCharacter: (build) => {
    saveBuild(build);
    const arch = ARCHETYPES.find((a) => a.id === build.archetype) || ARCHETYPES[0];
    const skills = resolveSkills(build);
    set({
      character: build,
      username: build.callsign,
      playerStats: {
        ...get().playerStats,
        money: arch.startingMoney,
        skills,
      },
      inventory: [...arch.startingKit],
      currentWeaponId: arch.startingKit[0] || 'fists',
    });
  },
  harvestIntoBag: (yields) => {
    const s = get();
    const mods = get().getModifiers();
    let mult = mods.harvestYield;
    if (isPassActive(s.pass)) mult *= PASS_BENEFITS.harvestMult;
    if (Date.now() < s.buffs.harvestDoubleUntil) mult *= 2;
    const scaled: Partial<ResourceBag> = {};
    for (const [k, v] of Object.entries(yields)) {
      scaled[k as ResourceId] = Math.max(1, Math.round((v || 0) * mult));
    }
    set({ bag: applyHarvest(s.bag, scaled) });
    get().addAction('harvested');
    get().noteBoardEvent('harvest');
    get().gainXp('harvest');
    get().saveGameState();
  },
  craftRecipe: (recipeId) => {
    const recipe = RECIPES.find((r) => r.id === recipeId) as Recipe | undefined;
    if (!recipe) return false;
    const s = get();
    const mods = computeModifiers(s.skillRanks);
    // Apply craft cost reduction by reducing costs virtually
    const cheap: Recipe = {
      ...recipe,
      cost: Object.fromEntries(
        Object.entries(recipe.cost).map(([k, v]) => [
          k,
          Math.max(1, Math.ceil((v || 1) * mods.craftCost)),
        ])
      ) as Recipe['cost'],
      money: recipe.money
        ? Math.round(recipe.money * mods.craftCost)
        : recipe.money,
    };
    if (!canCraft(s.bag, s.playerStats.money, cheap)) return false;
    const result = applyCraft(s.bag, s.playerStats.money, cheap);
    if (!result) return false;
    set({
      bag: result.bag,
      playerStats: { ...s.playerStats, money: result.money },
    });
    if (recipe.outputKind === 'weapon') {
      get().addInventoryItem(recipe.output);
      get().setCurrentWeaponId(recipe.output);
    }
    get().addAction(`crafted_${recipe.id}`);
    get().gainXp('craft');
    get().saveGameState();
    return true;
  },
  buyResource: (id, qty = 1) => {
    const s = get();
    const result = tradeBuy(s.bag, s.playerStats.money, id, qty);
    if (!result) return false;
    set({
      bag: result.bag,
      playerStats: { ...s.playerStats, money: result.money },
    });
    get().saveGameState();
    return true;
  },
  sellResource: (id, qty = 1) => {
    const s = get();
    const result = tradeSell(s.bag, s.playerStats.money, id, qty);
    if (!result) return false;
    set({
      bag: result.bag,
      playerStats: { ...s.playerStats, money: result.money },
    });
    get().saveGameState();
    return true;
  },
  useStim: () => {
    const s = get();
    if ((s.bag.stim_vial || 0) < 1) return false;
    if (s.playerStats.health >= 100) return false;
    set({
      bag: { ...s.bag, stim_vial: s.bag.stim_vial - 1 },
      playerStats: {
        ...s.playerStats,
        health: Math.min(100, s.playerStats.health + 40),
      },
    });
    get().addAction('used_stim');
    get().saveGameState();
    return true;
  },
  joinFaction: (id) => {
    if (id === 'null') {
      get().leaveFaction();
      return;
    }
    const f = getFaction(id);
    const standing = { ...get().factionStanding, [id]: f.joinStanding };
    set({ factionId: id, factionStanding: standing });
    get().addAction(`joined_${id}`);
    get().noteBoardEvent('faction');
    get().gainXp('faction');
    try {
      localStorage.setItem('ironhaven-faction', id);
    } catch {
      /* ignore */
    }
  },
  leaveFaction: () => {
    set({ factionId: 'null' });
    get().addAction('left_faction');
    try {
      localStorage.setItem('ironhaven-faction', 'null');
    } catch {
      /* ignore */
    }
  },
  adjustFactionStanding: (id, delta) => {
    set((s) => ({
      factionStanding: {
        ...s.factionStanding,
        [id]: Math.max(-100, Math.min(100, (s.factionStanding[id] || 0) + delta)),
      },
    }));
  },
  createPlayerClub: (name, tag, motto) => {
    const club = createClub(name, tag, get().username, motto);
    saveLocalClub(club);
    set({ club });
    get().addAction('club_created');
  },
  setClub: (club) => {
    saveLocalClub(club);
    set({ club });
  },
  leavePlayerClub: () => {
    const c = get().club;
    if (!c) return;
    const next = leaveClub(c, get().username);
    saveLocalClub(next);
    set({ club: next });
    get().addAction('club_left');
  },
  setPvpEnabled: (on) => {
    set({ pvpEnabled: on });
    get().addAction(on ? 'pvp_on' : 'pvp_off');
  },
  addFish: (id) => {
    set((s) => ({
      fishBag: { ...s.fishBag, [id]: (s.fishBag[id] || 0) + 1 },
    }));
    get().addAction(`caught_${id}`);
    get().noteBoardEvent('fish');
    // Rarer fish already weighted in tables; flat fish XP here.
    const bonus =
      id === 'void_koi' ? 80 : id === 'toxic_eel' ? 40 : id === 'chrome_bass' ? 25 : 18;
    get().gainXp('fish', bonus);
  },
  sellFish: () => {
    const s = get();
    const { bag, money } = sellAllFish(s.fishBag);
    if (money <= 0) return 0;
    set({
      fishBag: bag,
      playerStats: { ...s.playerStats, money: s.playerStats.money + money },
    });
    get().saveGameState();
    return money;
  },
  registerPvpKill: () => {
    set((s) => ({
      sessionStats: {
        ...s.sessionStats,
        pvpKills: s.sessionStats.pvpKills + 1,
        totalKills: s.sessionStats.totalKills + 1,
      },
    }));
    get().noteBoardEvent('kill');
    get().gainXp('pvp');
  },
  registerBossKill: () => {
    set((s) => ({
      sessionStats: {
        ...s.sessionStats,
        bossKills: s.sessionStats.bossKills + 1,
        totalKills: s.sessionStats.totalKills + 1,
      },
    }));
    get().noteBoardEvent('kill');
    get().gainXp('boss');
  },
  registerHuntKill: () => {
    set((s) => ({
      sessionStats: {
        ...s.sessionStats,
        huntKills: s.sessionStats.huntKills + 1,
        totalKills: s.sessionStats.totalKills + 1,
      },
    }));
    get().noteBoardEvent('hunt');
    get().noteBoardEvent('kill');
  },
  clearXpToast: () => set({ xpToast: null }),
  initializePlayer: async (username?: string) => {
    try {
      // Restore full local progress first (XP, bag, skills, board, faction).
      const local = loadProgressSnapshot();
      if (local) {
        applyProgressSnapshot(set, local);
      }

      let name = username || get().username || local?.username;
      if (!name) {
        try {
          name = localStorage.getItem('ironhaven-username') || undefined;
        } catch {
          /* ignore */
        }
      }
      name = name || `Runner_${crypto.randomUUID().substring(0, 4)}`;
      try {
        localStorage.setItem('ironhaven-username', name);
      } catch {
        /* ignore */
      }

      let playerId = local?.playerId || null;
      if (playerId) {
        persistenceService.adoptPlayerId(
          playerId,
          persistenceService.isOfflineMode()
        );
        await persistenceService.startSession(playerId);
      } else {
        playerId = await persistenceService.initializePlayer(name);
        await persistenceService.startSession(playerId);
      }

      persistenceService.startAutoSave(() => {
        const state = get();
        // Side-effect: deep local snapshot every autosave tick.
        captureAndSaveProgress(get);
        return {
          id: playerId,
          username: state.username || name!,
          position: state.playerPosition,
          rotation: 0,
          health: state.playerStats.health,
          reputation: state.playerStats.reputation,
          wanted: state.playerStats.wanted,
          money: state.playerStats.money,
          policeKillCount: state.playerStats.policeKillCount,
          skills: state.playerStats.skills,
          inventory: state.inventory,
          currentWeaponId: state.currentWeaponId,
        };
      }, 30000);

      let factionId: FactionId = get().factionId || 'null';
      if (factionId === 'null') {
        try {
          const f = localStorage.getItem('ironhaven-faction') as FactionId | null;
          if (f) factionId = f;
        } catch {
          /* ignore */
        }
      }
      set({ playerId, username: name, factionId, club: loadLocalClub() });
      captureAndSaveProgress(get);
    } catch (error) {
      console.error('Failed to initialize player:', error);
    }
  },
  saveGameState: async () => {
    const state = get();
    if (!state.playerId) return;

    captureAndSaveProgress(get);

    await persistenceService.savePlayerState({
      id: state.playerId,
      username: state.username || 'Runner',
      position: state.playerPosition,
      rotation: 0,
      health: state.playerStats.health,
      reputation: state.playerStats.reputation,
      wanted: state.playerStats.wanted,
      money: state.playerStats.money,
      policeKillCount: state.playerStats.policeKillCount,
      skills: state.playerStats.skills,
      inventory: state.inventory,
      currentWeaponId: state.currentWeaponId,
    });
  },
  loadGameState: async (playerId: string) => {
    const local = loadProgressSnapshot();
    if (local && (!local.playerId || local.playerId === playerId)) {
      applyProgressSnapshot(set, local);
    }

    const playerData = await persistenceService.loadPlayerState(playerId);
    if (playerData) {
      set((s) => ({
        playerId: playerData.id,
        playerPosition: playerData.position,
        username: playerData.username,
        playerStats: {
          ...s.playerStats,
          health: playerData.health,
          reputation: playerData.reputation,
          wanted: playerData.wanted,
          money: playerData.money,
          policeKillCount: playerData.policeKillCount,
          skills: playerData.skills,
          // Keep local XP/level/skillPoints if server row is thinner.
          xp: s.playerStats.xp,
          level: s.playerStats.level,
          skillPoints: s.playerStats.skillPoints,
        },
        inventory: playerData.inventory,
        currentWeaponId: playerData.currentWeaponId,
      }));
    }
  },
}));

function captureAndSaveProgress(get: () => GameState): void {
  const s = get();
  const snap: ProgressSnapshot = {
    version: 1,
    savedAt: Date.now(),
    playerId: s.playerId,
    username: s.username,
    playerStats: { ...s.playerStats, skills: { ...s.playerStats.skills } },
    skillRanks: { ...s.skillRanks },
    abilityBar: [...s.abilityBar],
    inventory: [...s.inventory],
    bag: { ...s.bag },
    fishBag: { ...s.fishBag },
    currentWeaponId: s.currentWeaponId,
    playerPosition: [...s.playerPosition] as [number, number, number],
    factionId: s.factionId,
    factionStanding: { ...s.factionStanding },
    pvpEnabled: s.pvpEnabled,
    dailyBoard: s.dailyBoard,
    boardCounters: { ...s.boardCounters },
    boardClaimed: [...s.boardClaimed],
    territory: s.territory,
  };
  saveProgressSnapshot(snap);
  try {
    localStorage.setItem('ironhaven-faction', s.factionId);
  } catch {
    /* ignore */
  }
}

function applyProgressSnapshot(
  set: (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void,
  snap: ProgressSnapshot
): void {
  set({
    playerId: snap.playerId,
    username: snap.username,
    playerStats: {
      ...snap.playerStats,
      skills: { ...snap.playerStats.skills },
    },
    skillRanks: { ...snap.skillRanks },
    abilityBar: [...snap.abilityBar],
    inventory: [...snap.inventory],
    bag: { ...snap.bag },
    fishBag: { ...snap.fishBag },
    currentWeaponId: snap.currentWeaponId,
    playerPosition: [...snap.playerPosition] as [number, number, number],
    factionId: snap.factionId,
    factionStanding: { ...snap.factionStanding },
    pvpEnabled: snap.pvpEnabled,
    dailyBoard: snap.dailyBoard,
    boardCounters: { ...snap.boardCounters },
    boardClaimed: [...snap.boardClaimed],
    territory: snap.territory,
  });
}
