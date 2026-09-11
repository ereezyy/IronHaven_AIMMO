import type { StreetObjective } from './objectives';

export function newlyCompletedObjectives(
  street: StreetObjective[],
  rewarded: Set<string>
): StreetObjective[] {
  return street.filter((o) => o.done && o.reward > 0 && !rewarded.has(o.id));
}

export function shouldNudgePass(args: {
  talkedDone: boolean;
  killDone: boolean;
  passActive: boolean;
  alreadyNudged: boolean;
}): boolean {
  return (
    args.talkedDone && args.killDone && !args.passActive && !args.alreadyNudged
  );
}

export function formatContractPayout(label: string, reward: number): string {
  const short = label.replace(/\s*\(.*\)\s*$/, '').trim();
  return `Contract cleared — ${short} · +$${reward}`;
}
