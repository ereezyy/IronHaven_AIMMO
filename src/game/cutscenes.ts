/**
 * Iron Haven cinematic scripts — pure data for CutscenePlayer.
 * Beats advance on timer or player input (skip / next).
 * Optional speaker + subtitle drive the caption bar + procedural voice.
 */

import { getFaction, type FactionId } from './factions';
import type { StreetContract } from '../lib/npcAi';

export type CutsceneId =
  | 'opening'
  | 'district_drop'
  | 'level_up'
  | 'death'
  | 'first_blood'
  | 'boss_approach'
  | 'pass_welcome'
  | 'faction_join'
  | 'mission_brief';

export type VoiceTone = 'system' | 'director' | 'street' | 'hostile' | 'warm';

export interface CutsceneBeat {
  id: string;
  /** Small eyebrow label above title. */
  chapter?: string;
  title: string;
  body?: string;
  /** Duration before auto-advance (ms). */
  durationMs: number;
  /** Accent color for title underline / glow. */
  accent?: string;
  /** Optional location card (e.g. "NORTH SPINE"). */
  location?: string;
  /** Visual mood for player background. */
  mood?: 'void' | 'city' | 'blood' | 'gold' | 'signal' | 'faction';
  /** Who is "speaking" — shown on subtitle bar. */
  speaker?: string;
  /** Explicit subtitle line (defaults to body). */
  subtitle?: string;
  /** Procedural voice tone for this beat. */
  voice?: VoiceTone;
}

export interface CutsceneScript {
  id: CutsceneId;
  name: string;
  beats: CutsceneBeat[];
  /** Allow skip entire sequence. Default true. */
  skippable?: boolean;
  /** Show letterbox bars. Default true. */
  letterbox?: boolean;
}

/** Longer prologue — city lore, AI director, your place in it. */
export const OPENING_CUTSCENE: CutsceneScript = {
  id: 'opening',
  name: 'Cold Arrival',
  skippable: true,
  letterbox: true,
  beats: [
    {
      id: 'blackout',
      chapter: 'prologue · 00',
      title: 'The grid never sleeps.',
      body: 'Neither do the people who own it.',
      subtitle: 'Neither do the people who own it.',
      speaker: 'SYSTEM',
      voice: 'system',
      durationMs: 4800,
      mood: 'void',
      accent: '#c03a30',
    },
    {
      id: 'signal',
      chapter: 'prologue · 01',
      title: 'A carrier wave cuts the fog.',
      body: 'Encrypted. Expensive. Already listening for your reply.',
      subtitle: 'Encrypted. Expensive. Already listening for your reply.',
      speaker: 'UPLINK',
      voice: 'system',
      durationMs: 4600,
      mood: 'signal',
      accent: '#3f7d9a',
      location: 'CHANNEL · OPEN',
    },
    {
      id: 'city',
      chapter: 'district 01',
      title: 'Iron Haven',
      body: 'A coastal megasprawl run by corps, clubs, and whatever still crawls between the neon.',
      subtitle:
        'Corps own the skyline. Clubs own the basements. You own whatever you can hold for ten minutes.',
      speaker: 'STREET DIRECTOR',
      voice: 'director',
      durationMs: 6200,
      mood: 'city',
      location: 'NORTH SPINE · EU-WEST-3',
      accent: '#c03a30',
    },
    {
      id: 'factions',
      chapter: 'the board',
      title: 'Three colors. Zero mercy.',
      body: 'Neon Syndicate · Chrome Guard · Dock Rats. Pick a side — or die freelancing.',
      subtitle:
        'Syndicate sells the night. Guard sells order. Rats sell the waterline. Loyalty is a discount, not a shield.',
      speaker: 'STREET DIRECTOR',
      voice: 'director',
      durationMs: 6000,
      mood: 'city',
      accent: '#c03a30',
    },
    {
      id: 'runners',
      chapter: 'the street',
      title: 'You are not the hero.',
      body: 'You are a callsign, a loadout, and a debt.',
      subtitle:
        'The AI director writes the next job while you bleed for the last one. That is the loop. That is the game.',
      speaker: 'STREET DIRECTOR',
      voice: 'street',
      durationMs: 6400,
      mood: 'signal',
      accent: '#c03a30',
    },
    {
      id: 'ai',
      chapter: 'neural',
      title: 'Grok rides shotgun.',
      body: 'NPCs remember. Contracts mutate. The city improvises.',
      subtitle:
        'Every conversation can become a contract. Every contract can become a funeral. Talk carefully.',
      speaker: 'AI DIRECTOR',
      voice: 'system',
      durationMs: 5600,
      mood: 'signal',
      accent: '#c9a15a',
      location: 'LLM · OPTIONAL',
    },
    {
      id: 'hook',
      chapter: 'entry',
      title: 'Drop in. Make a name.',
      body: 'Hunt. Trade. Join a faction. Or vanish before the heat finds you.',
      subtitle:
        'Press through the uplink. Build a runner. Step onto chrome. The shard is live.',
      speaker: 'SYSTEM',
      voice: 'warm',
      durationMs: 5400,
      mood: 'city',
      location: 'UPLINK READY',
      accent: '#c9a15a',
    },
  ],
};

export const DISTRICT_DROP_CUTSCENE: CutsceneScript = {
  id: 'district_drop',
  name: 'District Drop',
  skippable: true,
  letterbox: true,
  beats: [
    {
      id: 'drop',
      chapter: 'deploy',
      title: 'Feet on chrome.',
      body: 'Pointer lock · WASD move · Click to strike · E to talk · K skills · O pass · J job · U social',
      subtitle:
        'You are live on the shard. Controls are muscle memory — jobs and factions are destiny.',
      speaker: 'DISPATCH',
      voice: 'system',
      durationMs: 5200,
      mood: 'city',
      location: 'OPEN STREETS',
      accent: '#c03a30',
    },
    {
      id: 'objective',
      chapter: 'first hour',
      title: 'Prove you exist.',
      body: 'Talk to someone. Harvest scrap. Land a hunt. Stack paper before the city notices.',
      subtitle:
        'Press J for a street contract briefing. Press U to wear a color. Die once if you must — learn twice.',
      speaker: 'STREET DIRECTOR',
      voice: 'director',
      durationMs: 5000,
      mood: 'signal',
      accent: '#c03a30',
    },
  ],
};

export const FIRST_BLOOD_CUTSCENE: CutsceneScript = {
  id: 'first_blood',
  name: 'First Blood',
  skippable: true,
  letterbox: true,
  beats: [
    {
      id: 'blood',
      chapter: 'combat',
      title: 'First blood.',
      body: 'The street remembers. Heat climbs. XP drops. Keep moving.',
      subtitle: 'One body. A ledger entry. Do not stop to admire the work.',
      speaker: 'STREET DIRECTOR',
      voice: 'hostile',
      durationMs: 3400,
      mood: 'blood',
      accent: '#c03a30',
    },
  ],
};

export const BOSS_APPROACH_CUTSCENE: CutsceneScript = {
  id: 'boss_approach',
  name: 'Boss Contact',
  skippable: true,
  letterbox: true,
  beats: [
    {
      id: 'boss',
      chapter: 'threat',
      title: 'Something heavy just moved.',
      body: 'Boss signature on the map. Bring a loadout — or bring friends.',
      subtitle:
        'District apex. Not a street scuffle. Commit or clear the radius.',
      speaker: 'THREAT NET',
      voice: 'hostile',
      durationMs: 4000,
      mood: 'blood',
      location: 'HOSTILE ZONE',
      accent: '#c03a30',
    },
  ],
};

export const PASS_WELCOME_CUTSCENE: CutsceneScript = {
  id: 'pass_welcome',
  name: 'Pass Active',
  skippable: true,
  letterbox: true,
  beats: [
    {
      id: 'pass',
      chapter: 'iron haven pass',
      title: 'You bought the week.',
      body: '+25% XP · shop discount · weekly skill points · VIP tag. Stay lethal.',
      subtitle:
        'Premium uplink locked. Claim weekly skill points from the Pass panel.',
      speaker: 'BILLING',
      voice: 'warm',
      durationMs: 3800,
      mood: 'gold',
      accent: '#c9a15a',
    },
  ],
};

const FACTION_JOIN_LINES: Record<
  Exclude<FactionId, 'null'>,
  { title: string; body: string; subtitle: string; speaker: string }
> = {
  neon_syndicate: {
    title: 'Colors of the Syndicate.',
    body: 'Style, stims, and street control. The night just got expensive for everyone else.',
    subtitle:
      'You wear red now. Ally Dock Rats. Hunt Chrome Guard. Shops on the Strip cut you a deal.',
    speaker: 'SYNDICATE FIXER',
  },
  chrome_guard: {
    title: 'Badge without a badge.',
    body: 'Order for a price. Corporate steel at your back — and a target on every Rat.',
    subtitle:
      'Precinct heat will look the other way… sometimes. Syndicate and Dock Rats will not.',
    speaker: 'GUARD HANDLER',
  },
  dock_rats: {
    title: 'Waterline family.',
    body: 'Scrap, fish, and smuggled firmware. The docks open when you wear green.',
    subtitle:
      'Syndicate is friend. Guard is enemy. Cast lines, haul scrap, never trust dry land fully.',
    speaker: 'RAT BOSS',
  },
};

/** Build faction induction cutscene when player joins a color. */
export function factionJoinCutscene(id: FactionId): CutsceneScript | null {
  if (id === 'null') return null;
  const f = getFaction(id);
  const lines = FACTION_JOIN_LINES[id];
  if (!lines) return null;
  return {
    id: 'faction_join',
    name: `Join ${f.name}`,
    skippable: true,
    letterbox: true,
    beats: [
      {
        id: 'oath',
        chapter: 'allegiance',
        title: lines.title,
        body: lines.body,
        subtitle: lines.subtitle,
        speaker: lines.speaker,
        voice: 'street',
        durationMs: 5200,
        mood: 'faction',
        accent: f.color,
        location: f.name.toUpperCase(),
      },
      {
        id: 'standing',
        chapter: 'standing',
        title: `Standing +${f.joinStanding}`,
        body: f.blurb,
        subtitle: `You are ${f.name} now. Press U anytime to switch sides — treason has a cost in dialogue.`,
        speaker: 'SOCIAL GRID',
        voice: 'system',
        durationMs: 4200,
        mood: 'faction',
        accent: f.color,
      },
    ],
  };
}

/** Build a level-up cutscene for the new level. */
export function levelUpCutscene(level: number): CutsceneScript {
  return {
    id: 'level_up',
    name: 'Level Up',
    skippable: true,
    letterbox: true,
    beats: [
      {
        id: 'lv',
        chapter: 'progression',
        title: `Level ${level}`,
        body:
          level % 5 === 0
            ? 'Milestone rank. Skill points banked. The district just got more dangerous — for them.'
            : 'Neural loadout expanded. Spend skill points with K. Vitality ceiling rose.',
        subtitle:
          level % 5 === 0
            ? 'Milestone. The board notices runners who climb this fast.'
            : 'Skill matrix unlocked another tier. Press K.',
        speaker: 'NEURAL',
        voice: 'system',
        durationMs: 3600,
        mood: 'signal',
        accent: '#c03a30',
        location: `RANK ${level}`,
      },
    ],
  };
}

/** Build a death cutscene with cash lost. */
export function deathCutscene(cashLost: number): CutsceneScript {
  return {
    id: 'death',
    name: 'Wasted',
    skippable: true,
    letterbox: true,
    beats: [
      {
        id: 'wasted',
        chapter: 'critical',
        title: 'Wasted.',
        body:
          cashLost > 0
            ? `$${cashLost} hit the asphalt. Heat dies with you. Get back up.`
            : 'No cash left to drop. Only pride. Respawn and try again.',
        subtitle:
          cashLost > 0
            ? `Cash loss: $${cashLost}. Respawn. Adapt. Do not make the same mistake twice.`
            : 'Empty pockets. Full lesson. Respawn.',
        speaker: 'SYSTEM',
        voice: 'hostile',
        durationMs: 4200,
        mood: 'blood',
        accent: '#c03a30',
        location: 'KIA',
      },
    ],
  };
}

/** Optional short sting when accepting a mission (if not using MissionBriefing UI). */
export function missionBriefCutscene(contract: StreetContract): CutsceneScript {
  return {
    id: 'mission_brief',
    name: 'Mission Brief',
    skippable: true,
    letterbox: true,
    beats: [
      {
        id: 'brief',
        chapter: contract.difficulty,
        title: contract.title,
        body: contract.description,
        subtitle: `${contract.goal.label} · payout $${contract.reward}`,
        speaker: 'HANDLER',
        voice: 'director',
        durationMs: 5000,
        mood: 'signal',
        accent: '#c03a30',
        location: `JOB · $${contract.reward}`,
      },
    ],
  };
}

export function totalDurationMs(script: CutsceneScript): number {
  return script.beats.reduce((n, b) => n + b.durationMs, 0);
}
