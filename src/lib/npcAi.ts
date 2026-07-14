// Bridge between street NPCs and the Grok-backed AI service.
// Pure helpers — DialogueOverlay stays thin; tests can cover mapping logic.

import { aiService, type NPCPersonality } from './ai';
import type { Npc, PlayerSnapshot } from '../game/npc';
import { llmClient } from './llmClient';

const TYPE_TO_PERSONALITY: Record<
  Npc['type'],
  Omit<NPCPersonality, 'currentMood'>
> = {
  civilian: {
    type: 'civilian',
    traits: ['nervous', 'streetwise', 'self-preserving'],
    background: 'A regular on the midtown strip who has seen too much.',
  },
  dealer: {
    type: 'dealer',
    traits: ['slick', 'opportunistic', 'paranoid'],
    background: 'Corner chemist moving stims and black-market firmware.',
  },
  gangster: {
    type: 'gang_member',
    traits: ['loyal', 'violent', 'proud'],
    background: 'Crew soldier holding turf for the district boss.',
  },
  police: {
    type: 'police',
    traits: ['authoritarian', 'corruptible', 'exhausted'],
    background: 'Metro enforcer paid half in scrip, half in bribes.',
  },
  hitman: {
    type: 'informant',
    traits: ['cold', 'professional', 'dry humor'],
    background: 'Contract killer who only talks business.',
  },
  boss: {
    type: 'gang_member',
    traits: ['commanding', 'calculating', 'dangerous'],
    background: 'District underboss who owns every debt on this block.',
  },
};

function moodFromStats(npc: Npc, stats: PlayerSnapshot): string {
  if (npc.mood === 'hostile') return 'ready to fight';
  if (npc.mood === 'fleeing') return 'scared';
  if (stats.wanted >= 3) return 'on edge about the heat';
  if (stats.reputation >= 40) return 'respectful of your reputation';
  if (stats.kills >= 10) return 'wary of your body count';
  return 'guarded but talking';
}

export function personalityFor(
  npc: Npc,
  stats: PlayerSnapshot
): NPCPersonality {
  const base = TYPE_TO_PERSONALITY[npc.type];
  return {
    ...base,
    currentMood: moodFromStats(npc, stats),
  };
}

export function sceneContext(npc: Npc, stats: PlayerSnapshot): string {
  return (
    `Night streets of Iron Haven. Speaking with ${npc.name} (${npc.type}). ` +
    `Player wanted=${stats.wanted}/5, rep=${stats.reputation}, ` +
    `police kills=${stats.kills}, cash on hand matters. ` +
    `NPC health fraction=${(npc.health / npc.maxHealth).toFixed(2)}.`
  );
}

export function aiConfigured(): boolean {
  return llmClient.isConfigured();
}

/** Opening line when the player walks up (Grok or fallback). */
export async function aiGreeting(
  npc: Npc,
  stats: PlayerSnapshot
): Promise<string | null> {
  if (!aiConfigured()) return null;
  const res = await aiService.generateNPCDialogue(
    personalityFor(npc, stats),
    '(The player approaches and waits for you to speak first.)',
    sceneContext(npc, stats)
  );
  return res.text?.trim() || null;
}

/** Freeform reply to something the player typed. */
export async function aiReply(
  npc: Npc,
  stats: PlayerSnapshot,
  playerMessage: string
): Promise<string | null> {
  if (!aiConfigured() || !playerMessage.trim()) return null;
  const res = await aiService.generateNPCDialogue(
    personalityFor(npc, stats),
    playerMessage.trim(),
    sceneContext(npc, stats)
  );
  return res.text?.trim() || null;
}

export type ContractGoalKind =
  | 'kills'
  | 'earn'
  | 'talks'
  | 'rep'
  | 'clear_heat';

export interface ContractGoal {
  kind: ContractGoalKind;
  /** Absolute target (kills total, money to earn, talks, rep, or 0 wanted). */
  target: number;
  label: string;
}

export interface StreetContract {
  id: string;
  title: string;
  description: string;
  reward: number;
  difficulty: string;
  goal: ContractGoal;
  /** Snapshot when the job was accepted — progress is delta from these. */
  baseline: {
    kills: number;
    money: number;
    talks: number;
    reputation: number;
    wanted: number;
  };
}

export interface ContractProgress {
  current: number;
  target: number;
  done: boolean;
  label: string;
}

/** Rule-based trackable goal so Grok flavor always has a completable loop. */
export function pickContractGoal(
  stats: PlayerSnapshot,
  flavor: { title: string; description: string; difficulty: string }
): ContractGoal {
  const text = `${flavor.title} ${flavor.description}`.toLowerCase();
  const hard = flavor.difficulty === 'hard' ? 1 : 0;

  if (stats.wanted > 0 || /heat|wanted|lay low|escape|cop|police/.test(text)) {
    return {
      kind: 'clear_heat',
      target: 0,
      label: 'Let heat drop to zero',
    };
  }
  if (/talk|meet|intel|inform|whisper|deal|convince/.test(text)) {
    return {
      kind: 'talks',
      target: 2 + hard,
      label: `Talk to ${2 + hard} people`,
    };
  }
  if (/rep|name|fame|respect|crew|boss/.test(text)) {
    return {
      kind: 'rep',
      target: stats.reputation + 15 + hard * 10,
      label: `Reach ${stats.reputation + 15 + hard * 10} rep`,
    };
  }
  if (/cash|money|stack|earn|pay|score|heist|stim/.test(text)) {
    const gain = 400 + hard * 400;
    return {
      kind: 'earn',
      target: gain,
      label: `Earn $${gain}`,
    };
  }
  // Default street work: bodies.
  const n = 2 + hard;
  return {
    kind: 'kills',
    target: n,
    label: `Drop ${n} bodies`,
  };
}

export function contractProgress(
  c: StreetContract,
  live: {
    kills: number;
    money: number;
    talks: number;
    reputation: number;
    wanted: number;
  }
): ContractProgress {
  const g = c.goal;
  let current = 0;
  let target = g.target;
  let done = false;

  switch (g.kind) {
    case 'kills':
      current = Math.max(0, live.kills - c.baseline.kills);
      done = current >= target;
      break;
    case 'earn':
      current = Math.max(0, live.money - c.baseline.money);
      done = current >= target;
      break;
    case 'talks':
      current = Math.max(0, live.talks - c.baseline.talks);
      done = current >= target;
      break;
    case 'rep':
      current = live.reputation;
      target = g.target;
      done = current >= target;
      break;
    case 'clear_heat':
      current = live.wanted;
      target = 0;
      done = live.wanted <= 0;
      break;
  }

  return { current, target, done, label: g.label };
}

function fallbackContract(stats: PlayerSnapshot): StreetContract {
  const flavor = {
    title: 'Night Shift',
    description:
      'The street always has work. Make noise, make money, or make yourself scarce.',
    difficulty: stats.wanted > 0 ? 'medium' : 'easy',
  };
  const goal = pickContractGoal(stats, flavor);
  return {
    id: `street_${crypto.randomUUID()}`,
    title: flavor.title,
    description: flavor.description,
    reward: 250 + Math.floor(stats.reputation * 5),
    difficulty: flavor.difficulty,
    goal,
    baseline: {
      kills: stats.kills,
      money: 0, // filled by caller with real money
      talks: 0,
      reputation: stats.reputation,
      wanted: stats.wanted,
    },
  };
}

/**
 * Grok-authored side job with a mechanical goal attached.
 * Always returns a contract when offline (scripted fallback) so J always works.
 */
export async function aiStreetContract(
  stats: PlayerSnapshot,
  money: number,
  talks: number
): Promise<StreetContract> {
  const baseline = {
    kills: stats.kills,
    money,
    talks,
    reputation: stats.reputation,
    wanted: stats.wanted,
  };

  if (!aiConfigured()) {
    const fb = fallbackContract(stats);
    return { ...fb, baseline: { ...baseline } };
  }

  const level = Math.max(1, 1 + Math.floor(stats.reputation / 20));
  const mission = await aiService.generateMission(
    level,
    'Iron Haven night district',
    stats.wanted > 0 ? 'escape_heat' : 'street_crime',
    `Player rep ${stats.reputation}, wanted ${stats.wanted}, kills ${stats.kills}.`
  );

  if (!mission?.title) {
    const fb = fallbackContract(stats);
    return { ...fb, baseline: { ...baseline } };
  }

  // Prefer Grok's structured goalKind when present; else infer from flavor.
  const raw = mission as {
    goalKind?: string;
    goalTarget?: number;
  };
  let goal = pickContractGoal(stats, {
    title: mission.title,
    description: mission.description,
    difficulty: mission.difficulty,
  });
  const kinds: ContractGoalKind[] = [
    'kills',
    'earn',
    'talks',
    'rep',
    'clear_heat',
  ];
  if (raw.goalKind && kinds.includes(raw.goalKind as ContractGoalKind)) {
    const kind = raw.goalKind as ContractGoalKind;
    const target =
      kind === 'clear_heat'
        ? 0
        : Math.max(1, Math.floor(raw.goalTarget || goal.target));
    goal = {
      kind,
      target: kind === 'rep' ? stats.reputation + target : target,
      label:
        kind === 'kills'
          ? `Drop ${target} bodies`
          : kind === 'earn'
            ? `Earn $${target}`
            : kind === 'talks'
              ? `Talk to ${target} people`
              : kind === 'rep'
                ? `Reach ${stats.reputation + target} rep`
                : 'Let heat drop to zero',
    };
  }

  return {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    reward: mission.reward,
    difficulty: mission.difficulty,
    goal,
    baseline,
  };
}
