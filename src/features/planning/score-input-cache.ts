import { copyPlain } from '../../persistence/plain-data';
import type { CandidateEvaluatorOptions } from './candidate-evaluator';
import type { EvaluateDraftInput } from '../../capabilities/planning/evaluate-draft';
type PrepareScore = CandidateEvaluatorOptions['prepareScore'];
type Hooks = Pick<EvaluateDraftInput, 'assess' | 'amendDraft' | 'blocksMovement' | 'search'>;
/** One candidate per policy/observation owner. Native function ports stay live; plain inputs stay detached. */
export function createScoreInputCache(prepare: PrepareScore): PrepareScore {
  let saved: { signature: string; data: string; hooks: Hooks } | undefined;
  return (candidate, entries) => {
    const signature = JSON.stringify([candidate, entries]);
    if (saved?.signature !== signature) {
      const { assess, amendDraft, blocksMovement, search, ...data } = prepare(candidate, entries);
      const hooks: Hooks = { blocksMovement, search, ...(assess ? { assess } : {}), ...(amendDraft ? { amendDraft } : {}) };
      saved = { signature, data: JSON.stringify(copyPlain(data)), hooks };
    }
    return { ...JSON.parse(saved.data) as Omit<EvaluateDraftInput, keyof Hooks>, ...saved.hooks };
  };
}
