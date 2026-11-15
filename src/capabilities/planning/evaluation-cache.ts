import { prepareEvaluation } from './evaluate-draft';
import type { EvaluateDraftInput } from './evaluate-draft';
/** Caller-owned single-candidate cache; losing heap state simply repeats the hard checks. */
export function createEvaluationCache(prepare: typeof prepareEvaluation = prepareEvaluation): typeof prepareEvaluation {
  let cached: { signature: string; assess: EvaluateDraftInput['assess']; result: ReturnType<typeof prepareEvaluation> } | undefined;
  return input => {
    const types = [...new Set(input.entries.map(entry => entry.type))].sort();
    const blockers = types.map(type => [type, input.blocksMovement(type)]);
    const signature = JSON.stringify([input.entries, input.observation, input.limits,
      input.protectedTypes, input.barrierCosts, blockers]);
    if (cached?.signature !== signature || cached.assess !== input.assess) {
      cached = { signature, assess: input.assess, result: prepare(input) };
    }
    // Preparation results are small plain diagnostics, detached from cache consumers.
    return JSON.parse(JSON.stringify(cached.result)) as ReturnType<typeof prepareEvaluation>;
  };
}
