import { framedIdentity } from '../../core/framed-identity';
import { prepareEvaluation, completeEvaluation } from './evaluate-draft';
import type { EvaluateDraftInput } from './evaluate-draft';
import { draftRouteBatch } from './draft-route-batch';
import type { DraftRouteCheckpoint } from './draft-route-batch';
export function evaluateDraftBatch(
  input: EvaluateDraftInput, revision: string, checkpoint: DraftRouteCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
  prepare: typeof prepareEvaluation = prepareEvaluation,
) {
  const prepared = prepare(input);
  if (!prepared.ok) return prepared;
  const policy = framedIdentity(['evaluation-policy-v2', revision, JSON.stringify([input.desiredCapacity, input.constructionCost,
    input.retirementCost, input.protectedTypes, input.barrierCosts])]);
  const routes = draftRouteBatch(input, policy, checkpoint, maximumSearches, canContinue);
  if (!routes.ok) return { ok: false as const, phase: routes.phase, details: routes };
  if (!routes.done) return { ok: true as const, done: false as const, checkpoint: routes.checkpoint, searches: routes.searches };
  const complete = completeEvaluation(input, prepared.defense, { ok: true, hauling: routes.hauling, service: routes.service });
  return { ...complete, done: true as const, checkpoint: routes.checkpoint, searches: routes.searches };
}
