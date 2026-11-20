export interface ReactionLab {
  id: string; x: number; y: number;
  mineral: string | null; amount: number; free: number; cooldown: number; reactionAmount: number;
}
export interface ReactionNetwork { inputs: readonly [ReactionLab,ReactionLab]; outputs: readonly ReactionLab[] }
export interface LabReaction { output: string; inputs: readonly [string,string]; product: string; amount: number }
export type ReactionTable = Readonly<Record<string,Readonly<Record<string,string>>>>;
/** Use injected game constants; no duplicated chemistry table or mutable cached game objects. */
export function reactionReagents(table: ReactionTable, product: string): readonly [string,string] | null {
  for (const first of Object.keys(table).sort()) {
    const second = Object.keys(table[first]!).sort().find(second => table[first]![second] === product);
    if (second) return [first,second];
  }
  return null;
}
