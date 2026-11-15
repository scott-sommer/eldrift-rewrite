import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
export interface ReactionGeometry { inputs: [Tile, Tile]; outputs: Tile[] }
function withinReactionRange(output: Tile, input: Tile): boolean {
  return Math.abs(output.x - input.x) <= 2 && Math.abs(output.y - input.y) <= 2;
}
/** Select a deterministic pair that reaches every other lab, or reject the cluster. */
export function reactionGeometry(labs: readonly Tile[]): ReactionGeometry | undefined {
  const keys = labs.map(tileIndex);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate lab position');
  if (labs.length < 3) return undefined;
  const sorted = [...labs].sort((a, b) => tileIndex(a) - tileIndex(b));
  for (let first = 0; first < sorted.length - 1; first++) {
    for (let second = first + 1; second < sorted.length; second++) {
      const result = pairGeometry(sorted, first, second);
      if (result) return result;
    }
  }
  return undefined;
}
function pairGeometry(labs: readonly Tile[], first: number, second: number): ReactionGeometry | undefined {
  const a = labs[first]!;
  const b = labs[second]!;
  const outputs = labs.filter((_, index) => index !== first && index !== second);
  if (!outputs.every(output => withinReactionRange(output, a) && withinReactionRange(output, b))) return undefined;
  return { inputs: [{ ...a }, { ...b }], outputs: outputs.map(output => ({ ...output })) };
}
