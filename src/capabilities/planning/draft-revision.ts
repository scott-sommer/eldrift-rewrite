import type { FinishDraftInput } from './finish-draft';
/** Exact identity, not a hash: repeated cells are represented as value/count runs. */
export function draftRevision(input: Pick<FinishDraftInput, 'entries' | 'observation' | 'limits'>, searchRevision: string, costs: readonly number[]): string {
  return JSON.stringify(['draft-revision-v2', searchRevision, input.entries,
    { ...input.observation, terrain: compactSequence(input.observation.terrain) },
    input.limits, compactSequence(costs)]);
}
/** Tagged runs are unambiguous with raw arrays; irregular inputs keep the smaller raw form. */
export function compactSequence<T extends string | number>(values: readonly T[]): readonly T[] | { runs: [T, number][] } {
  const runs: [T, number][] = [];
  for (const value of values) {
    const last = runs.at(-1);
    if (last && last[0] === value) last[1]++;
    else runs.push([value, 1]);
  }
  const compressed = { runs };
  return JSON.stringify(compressed).length < JSON.stringify(values).length ? compressed : values;
}
