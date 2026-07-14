/**
 * Dynamic world events — the city reacts to what the player does.
 *
 * Pure, deterministic logic. The store/component feeds a WorldPulse each tick;
 * this module decides which event should be active, tracks its lifetime, and
 * exposes the reward multipliers that apply while it runs. No React / no timers
 * live here so it stays fully unit-testable.
 */

import type { FactionId } from './factions';

export type WorldEventKind =
  | 'turf_war'
  | 'boss_raid'
  | 'heat_wave'
  | 'gold_rush';

export interface WorldEventDef {
  kind: WorldEventKind;
  title: string;
  blurb: string;
  /** ms the event stays live once triggered. */
  durationMs: number;
  /** Cooldown before the same kind can retrigger. */
  cooldownMs: number;
  /** Combat XP / reward multiplier while active. */
  rewardMult: number;
  /** Kill-feed tone. */
  tone: 'kill' | 'territory' | 'info';
}

export const WORLD_EVENTS: Record<WorldEventKind, WorldEventDef> = {
  turf_war: {
    kind: 'turf_war',
    title: 'TURF WAR',
    blurb:
      'A zone just flipped — factions fight for the block. Kills pay double.',
    durationMs: 90_000,
    cooldownMs: 120_000,
    rewardMult: 2,
    tone: 'territory',
  },
  boss_raid: {
    kind: 'boss_raid',
    title: 'BOSS RAID',
    blurb: 'A world boss is enraged. Boss damage and spoils are boosted.',
    durationMs: 75_000,
    cooldownMs: 150_000,
    rewardMult: 1.75,
    tone: 'kill',
  },
  heat_wave: {
    kind: 'heat_wave',
    title: 'HEAT WAVE',
    blurb: 'The city is on fire. Every kill grants bonus XP until it cools.',
    durationMs: 60_000,
    cooldownMs: 120_000,
    rewardMult: 1.5,
    tone: 'kill',
  },
  gold_rush: {
    kind: 'gold_rush',
    title: 'GOLD RUSH',
    blurb: 'Cash flows on the street — earnings and harvest are richer.',
    durationMs: 60_000,
    cooldownMs: 180_000,
    rewardMult: 1.5,
    tone: 'info',
  },
};

/** Snapshot the caller feeds each tick. */
export interface WorldPulse {
  now: number;
  totalKills: number;
  pvpKills: number;
  bossKills: number;
  moneyEarned: number;
  /** Set true on the tick a territory zone flipped. */
  zoneFlipped: boolean;
  /** Faction that controls the most zones (for flavor). */
  dominantFaction: FactionId;
}

export interface ActiveWorldEvent {
  kind: WorldEventKind;
  startedAt: number;
  endsAt: number;
}

export interface WorldEventState {
  active: ActiveWorldEvent | null;
  /** kind → unix ms when its cooldown ends. */
  cooldownUntil: Partial<Record<WorldEventKind, number>>;
  /** Baselines captured when the current tracking window opened. */
  base: { totalKills: number; moneyEarned: number };
}

export function emptyWorldEventState(): WorldEventState {
  return {
    active: null,
    cooldownUntil: {},
    base: { totalKills: 0, moneyEarned: 0 },
  };
}

export function isEventActive(s: WorldEventState, now: number): boolean {
  return Boolean(s.active && s.active.endsAt > now);
}

/** Reward multiplier currently in effect (1 when nothing is live). */
export function eventRewardMult(s: WorldEventState, now: number): number {
  if (!s.active || s.active.endsAt <= now) return 1;
  return WORLD_EVENTS[s.active.kind].rewardMult;
}

function offCooldown(
  s: WorldEventState,
  kind: WorldEventKind,
  now: number
): boolean {
  const until = s.cooldownUntil[kind] ?? 0;
  return now >= until;
}

/** Choose which (if any) event a pulse should trigger, honoring cooldowns. */
export function pickTrigger(
  s: WorldEventState,
  p: WorldPulse
): WorldEventKind | null {
  const killsSince = p.totalKills - s.base.totalKills;
  const moneySince = p.moneyEarned - s.base.moneyEarned;
  // Priority: territory flip > boss surge > kill streak > cash surge.
  if (p.zoneFlipped && offCooldown(s, 'turf_war', p.now)) return 'turf_war';
  if (
    p.bossKills > 0 &&
    killsSince >= 1 &&
    p.zoneFlipped === false &&
    offCooldown(s, 'boss_raid', p.now) &&
    p.bossKills % 2 === 0
  ) {
    return 'boss_raid';
  }
  if (killsSince >= 8 && offCooldown(s, 'heat_wave', p.now)) return 'heat_wave';
  if (moneySince >= 2500 && offCooldown(s, 'gold_rush', p.now))
    return 'gold_rush';
  return null;
}

export interface WorldEventTransition {
  state: WorldEventState;
  /** Set when an event just started this tick. */
  started: WorldEventDef | null;
  /** Set when an event just expired this tick. */
  ended: WorldEventDef | null;
}

/**
 * Advance the event machine by one pulse. Expires the current event, then
 * (if idle) evaluates triggers and starts a new one, resetting baselines so
 * "since" thresholds measure from the last decision point.
 */
export function advance(
  s: WorldEventState,
  p: WorldPulse
): WorldEventTransition {
  let state = s;
  let ended: WorldEventDef | null = null;

  // Expire the active event.
  if (state.active && state.active.endsAt <= p.now) {
    const def = WORLD_EVENTS[state.active.kind];
    ended = def;
    state = {
      ...state,
      active: null,
      cooldownUntil: {
        ...state.cooldownUntil,
        [def.kind]: p.now + def.cooldownMs,
      },
      base: { totalKills: p.totalKills, moneyEarned: p.moneyEarned },
    };
  }

  // While an event is live, keep baselines fresh so post-event streaks are clean.
  if (isEventActive(state, p.now)) {
    return { state, started: null, ended };
  }

  const trigger = pickTrigger(state, p);
  if (!trigger) {
    return { state, started: null, ended };
  }

  const def = WORLD_EVENTS[trigger];
  const nextState: WorldEventState = {
    ...state,
    active: { kind: trigger, startedAt: p.now, endsAt: p.now + def.durationMs },
    base: { totalKills: p.totalKills, moneyEarned: p.moneyEarned },
  };
  return { state: nextState, started: def, ended };
}

export function eventRemainingMs(s: WorldEventState, now: number): number {
  if (!s.active) return 0;
  return Math.max(0, s.active.endsAt - now);
}
