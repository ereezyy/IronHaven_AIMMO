import { describe, it, expect } from 'vitest';
import {
  emptyWorldEventState,
  advance,
  pickTrigger,
  isEventActive,
  eventRewardMult,
  eventRemainingMs,
  WORLD_EVENTS,
  type WorldPulse,
  type WorldEventState,
} from './worldEvents';

function pulse(over: Partial<WorldPulse> = {}): WorldPulse {
  return {
    now: 1_000,
    totalKills: 0,
    pvpKills: 0,
    bossKills: 0,
    moneyEarned: 0,
    zoneFlipped: false,
    dominantFaction: 'null',
    ...over,
  };
}

describe('world events triggers', () => {
  it('starts a turf war when a zone flips', () => {
    const t = advance(emptyWorldEventState(), pulse({ zoneFlipped: true }));
    expect(t.started?.kind).toBe('turf_war');
    expect(t.state.active?.kind).toBe('turf_war');
  });

  it('starts a heat wave after an 8-kill streak', () => {
    const t = advance(emptyWorldEventState(), pulse({ totalKills: 8 }));
    expect(t.started?.kind).toBe('heat_wave');
  });

  it('starts a gold rush after $2500 earned', () => {
    const t = advance(emptyWorldEventState(), pulse({ moneyEarned: 2500 }));
    expect(t.started?.kind).toBe('gold_rush');
  });

  it('does nothing below thresholds', () => {
    const t = advance(
      emptyWorldEventState(),
      pulse({ totalKills: 3, moneyEarned: 100 })
    );
    expect(t.started).toBeNull();
    expect(t.state.active).toBeNull();
  });

  it('prioritizes turf war over kill streak', () => {
    const k = pickTrigger(
      emptyWorldEventState(),
      pulse({ zoneFlipped: true, totalKills: 20 })
    );
    expect(k).toBe('turf_war');
  });
});

describe('world events lifetime', () => {
  it('does not retrigger while one is active', () => {
    const s0 = emptyWorldEventState();
    const t1 = advance(s0, pulse({ now: 1_000, zoneFlipped: true }));
    expect(isEventActive(t1.state, 2_000)).toBe(true);
    // Another flip mid-event should be ignored.
    const t2 = advance(
      t1.state,
      pulse({ now: 2_000, zoneFlipped: true, totalKills: 30 })
    );
    expect(t2.started).toBeNull();
    expect(t2.state.active?.kind).toBe('turf_war');
  });

  it('expires and applies a cooldown', () => {
    const def = WORLD_EVENTS.turf_war;
    const t1 = advance(
      emptyWorldEventState(),
      pulse({ now: 1_000, zoneFlipped: true })
    );
    const afterEnd = t1.state.active!.endsAt + 1;
    const t2 = advance(t1.state, pulse({ now: afterEnd, zoneFlipped: false }));
    expect(t2.ended?.kind).toBe('turf_war');
    expect(t2.state.active).toBeNull();
    // Immediately flipping again is blocked by cooldown.
    const t3 = advance(
      t2.state,
      pulse({ now: afterEnd + 1, zoneFlipped: true })
    );
    expect(t3.started).toBeNull();
    // After the cooldown passes it can trigger again.
    const later = afterEnd + def.cooldownMs + 10;
    const t4 = advance(t3.state, pulse({ now: later, zoneFlipped: true }));
    expect(t4.started?.kind).toBe('turf_war');
  });

  it('reward multiplier reflects the active event and resets after', () => {
    const t1 = advance(
      emptyWorldEventState(),
      pulse({ now: 1_000, zoneFlipped: true })
    );
    expect(eventRewardMult(t1.state, 2_000)).toBe(
      WORLD_EVENTS.turf_war.rewardMult
    );
    const afterEnd = t1.state.active!.endsAt + 1;
    const t2 = advance(t1.state, pulse({ now: afterEnd }));
    expect(eventRewardMult(t2.state, afterEnd)).toBe(1);
  });

  it('reports remaining time', () => {
    const t1 = advance(
      emptyWorldEventState(),
      pulse({ now: 1_000, zoneFlipped: true })
    );
    const rem = eventRemainingMs(t1.state, 1_000);
    expect(rem).toBe(WORLD_EVENTS.turf_war.durationMs);
    expect(eventRemainingMs(t1.state, t1.state.active!.endsAt + 100)).toBe(0);
  });

  it('empty state has no active event and mult 1', () => {
    const s: WorldEventState = emptyWorldEventState();
    expect(isEventActive(s, 999_999)).toBe(false);
    expect(eventRewardMult(s, 999_999)).toBe(1);
  });
});
