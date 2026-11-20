import type { LabReaction, ReactionNetwork } from './model';
/** Available amounts already exclude external claims; reserve is a further policy floor. No success is inferred. */
export function planLabReactions(network: ReactionNetwork,product: string,needed: number,reserve: number): readonly LabReaction[] {
  if (![needed,reserve].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid reaction budget');
  const [first,second] = network.inputs;
  let available = Math.max(0,Math.min(first.amount,second.amount)-reserve), remaining = needed;
  const result: LabReaction[] = [];
  for (const lab of network.outputs) {
    const amount = lab.reactionAmount;
    if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('Invalid reaction amount');
    if (lab.cooldown > 0 || lab.free < amount || remaining < amount || available < amount) continue;
    result.push({ output: lab.id,inputs: [first.id,second.id],product,amount });
    available -= amount; remaining -= amount;
  }
  return result;
}
