// Reputation-aware dialogue tables. Pure data — the overlay renders these and
// applies the chosen option's effect to the game store.
import { Npc, PlayerSnapshot } from './npc';

export interface DialogueEffect {
  rep?: number;
  money?: number;
  wanted?: number;
  /** Delta applied to health (stims, medkits). Clamped to 0–100 by the store. */
  health?: number;
}

export interface DialogueOption {
  label: string;
  reply: string;
  effect?: DialogueEffect;
}

export interface Dialogue {
  speaker: string;
  line: string;
  options: DialogueOption[];
}

const LEAVE: DialogueOption = { label: 'Walk away', reply: '' };

export function npcDialogue(npc: Npc, p: PlayerSnapshot): Dialogue {
  const speaker = `${npc.name} · ${npc.type}`;
  switch (npc.type) {
    case 'dealer':
      return {
        speaker,
        line:
          p.kills > 15
            ? 'The murder king walks my corner. Special stock, just for you.'
            : p.reputation > 50
              ? 'Premium merchandise for a premium client.'
              : 'First time? I run starter packages, no judgement.',
        options: [
          {
            label: 'Buy a stim ($120)',
            reply: 'Pleasure doing business. Don\u2019t flatline on me.',
            effect: { money: -120, rep: 3, health: 40 },
          },
          {
            label: 'Shake him down',
            reply: 'Easy! Take it, take it — just keep me breathing.',
            effect: { money: 80, rep: 6, wanted: 1 },
          },
          LEAVE,
        ],
      };

    case 'gangster':
      return {
        speaker,
        line:
          p.reputation > 50
            ? 'Boss. The crew\u2019s been saying your name. We could use you.'
            : 'You got business here, or you just lost?',
        options: [
          {
            label: 'Offer to run a job',
            reply:
              p.reputation > 50
                ? 'Knew it. Cut\u2019s yours — go make a mess.'
                : 'Prove yourself first. Come back with a body count.',
            effect: p.reputation > 50 ? { rep: 10, money: 250 } : { rep: 2 },
          },
          {
            label: 'Talk trash',
            reply: 'Big mouth. That\u2019ll cost you on the street.',
            effect: { rep: -5 },
          },
          LEAVE,
        ],
      };

    case 'boss':
      return {
        speaker,
        line:
          p.reputation > 80
            ? 'So you\u2019re the one carving up my city. Bold.'
            : 'You don\u2019t walk up to me. Not yet.',
        options: [
          {
            label: 'Pledge allegiance',
            reply: 'Loyalty pays. Don\u2019t make me regret it.',
            effect: { rep: 15, money: 400 },
          },
          {
            label: 'Threaten him',
            reply: 'You\u2019ve got a death wish. Granted.',
            effect: { wanted: 2, rep: 8 },
          },
          LEAVE,
        ],
      };

    case 'police':
      return {
        speaker,
        line:
          p.wanted > 0
            ? 'Hands where I can see them, scumbag.'
            : 'Move along. Nothing for you here.',
        options: [
          {
            label: 'Bribe ($150)',
            reply: 'Never saw you. Now get gone.',
            effect: { money: -150, wanted: -1 },
          },
          {
            label: 'Resist',
            reply: 'Wrong choice. Backup\u2019s already rolling.',
            effect: { wanted: 1, rep: 4 },
          },
          LEAVE,
        ],
      };

    case 'hitman':
      return {
        speaker,
        line: 'Contracts only. You buying, or are you the contract?',
        options: [
          {
            label: 'Buy a contract ($300)',
            reply: 'Name\u2019s as good as crossed off.',
            effect: { money: -300, rep: 12 },
          },
          LEAVE,
        ],
      };

    default:
      return {
        speaker,
        line:
          p.wanted > 1
            ? 'Please — I have a family. Don\u2019t.'
            : p.reputation > 30
              ? 'You\u2019re that one everyone whispers about...'
              : 'Rough part of town, isn\u2019t it?',
        options: [
          {
            label: 'Ask for directions',
            reply: 'Market\u2019s east, docks south. Stay off the main strip.',
            effect: { rep: 1 },
          },
          {
            label: 'Intimidate',
            reply: 'Okay! Okay! Here — just leave me alone!',
            effect: { money: 30, wanted: 1, rep: 2 },
          },
          LEAVE,
        ],
      };
  }
}
