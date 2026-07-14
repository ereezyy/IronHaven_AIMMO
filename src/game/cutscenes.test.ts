import { describe, it, expect } from 'vitest';
import {
  OPENING_CUTSCENE,
  DISTRICT_DROP_CUTSCENE,
  FIRST_BLOOD_CUTSCENE,
  levelUpCutscene,
  deathCutscene,
  factionJoinCutscene,
  missionBriefCutscene,
  totalDurationMs,
} from './cutscenes';

describe('cutscene scripts', () => {
  it('opening is a long multi-beat prologue with speakers', () => {
    expect(OPENING_CUTSCENE.beats.length).toBeGreaterThanOrEqual(6);
    expect(OPENING_CUTSCENE.skippable).toBe(true);
    expect(totalDurationMs(OPENING_CUTSCENE)).toBeGreaterThan(25_000);
    expect(OPENING_CUTSCENE.beats.every((b) => b.speaker)).toBe(true);
    expect(OPENING_CUTSCENE.beats.every((b) => b.subtitle || b.body)).toBe(
      true
    );
  });

  it('district drop teaches controls', () => {
    const text = DISTRICT_DROP_CUTSCENE.beats.map((b) => b.body || '').join(' ');
    expect(text.toLowerCase()).toMatch(/wasd|skills|pass/);
  });

  it('level-up script includes level number', () => {
    const s = levelUpCutscene(7);
    expect(s.id).toBe('level_up');
    expect(s.beats[0].title).toContain('7');
  });

  it('death script mentions cash lost', () => {
    const s = deathCutscene(250);
    expect(s.beats[0].body).toContain('250');
    const empty = deathCutscene(0);
    expect(empty.beats[0].body?.toLowerCase()).toMatch(/no cash|pride/);
  });

  it('first blood is a short sting', () => {
    expect(FIRST_BLOOD_CUTSCENE.beats).toHaveLength(1);
    expect(totalDurationMs(FIRST_BLOOD_CUTSCENE)).toBeLessThan(5000);
  });

  it('builds faction join cutscenes with faction accent', () => {
    const syn = factionJoinCutscene('neon_syndicate');
    expect(syn).not.toBeNull();
    expect(syn!.id).toBe('faction_join');
    expect(syn!.beats[0].accent).toBe('#c03a30');
    expect(syn!.beats[0].location).toMatch(/syndicate/i);
    expect(factionJoinCutscene('null')).toBeNull();
  });

  it('builds mission brief sting from a contract', () => {
    const s = missionBriefCutscene({
      id: 'test',
      title: 'Night Run',
      description: 'Move packages.',
      reward: 400,
      difficulty: 'easy',
      goal: { kind: 'earn', target: 500, label: 'Earn $500' },
      baseline: {
        kills: 0,
        money: 0,
        talks: 0,
        reputation: 0,
        wanted: 0,
      },
    });
    expect(s.id).toBe('mission_brief');
    expect(s.beats[0].title).toBe('Night Run');
    expect(s.beats[0].subtitle).toMatch(/400/);
  });
});
