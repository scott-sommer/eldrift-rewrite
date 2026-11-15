import type { CandidateEvaluatorOptions } from '../features/planning/candidate-evaluator';
type PrepareScore = CandidateEvaluatorOptions['prepareScore'];
/** A room's current observation/policy owns its score preparation and assessment cache. */
export function createPlanningScoreCache() {
  let saved: { identity: string; prepare: PrepareScore } | undefined;
  return (identity: string, create: () => PrepareScore): PrepareScore => {
    if (!identity) throw new Error('Missing score preparation identity');
    if (saved?.identity !== identity) saved = { identity, prepare: create() };
    return saved.prepare;
  };
}
