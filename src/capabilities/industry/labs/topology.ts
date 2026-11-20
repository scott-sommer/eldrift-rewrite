import type { ReactionLab, ReactionNetwork } from './model';
function within(output: ReactionLab,input: ReactionLab): boolean { return Math.max(Math.abs(output.x-input.x),Math.abs(output.y-input.y)) <= 2; }
function compatible(lab: ReactionLab,mineral: string): boolean { return lab.mineral === null || lab.mineral === mineral; }
/** Bounded ten-lab search. Prefer stocked inputs, then usable output count; IDs break ties deterministically. */
export function selectReactionNetwork(labs: readonly ReactionLab[],reagents: readonly [string,string],product: string,allowDirty = false): ReactionNetwork | null {
  if (labs.length > 10 || new Set(labs.map(lab => lab.id)).size !== labs.length) throw new Error('Invalid reaction lab roster');
  const ordered = [...labs].sort((a,b) => a.id.localeCompare(b.id));
  let best: ReactionNetwork | null = null, score = -1;
  for (const first of ordered.filter(lab => (allowDirty || compatible(lab,reagents[0])))) {
    for (const second of ordered.filter(lab => lab.id !== first.id && (allowDirty || compatible(lab,reagents[1])))) {
      const outputs = ordered.filter(lab => lab.id !== first.id && lab.id !== second.id && (allowDirty || compatible(lab,product)) && within(lab,first) && within(lab,second));
      if (!outputs.length) continue;
      const ready = Math.min(first.mineral === reagents[0] ? first.amount : 0,second.mineral === reagents[1] ? second.amount : 0), candidate = Math.min(ready,3000)*10+outputs.length;
      if (candidate > score) { best = { inputs: [first,second],outputs }; score = candidate; }
    }
  }
  return best;
}
