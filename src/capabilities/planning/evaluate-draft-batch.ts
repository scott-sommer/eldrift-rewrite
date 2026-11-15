import { prepareEvaluation, completeEvaluation } from './evaluate-draft';
import type { EvaluateDraftInput } from './evaluate-draft';
import { draftRouteBatch } from './draft-route-batch';
import type { DraftRouteCheckpoint } from './draft-route-batch';
export function evaluateDraftBatch(
  input: EvaluateDraftInput, revision: string, checkpoint: DraftRouteCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  const prepared = prepareEvaluation(input);
  if (!prepared.ok) return prepared;
  const policy = JSON.stringify([revision, input.desiredCapacity, input.constructionCost,
    input.retirementCost, input.protectedTypes, input.barrierCosts]);
  const routes = draftRouteBatch(input, policy, checkpoint, maximumSearches, canContinue);
  if (!routes.ok) return { ok: false as const, phase: routes.phase, details: routes };
  if (!routes.done) return { ok: true as const, done: false as const, checkpoint: routes.checkpoint, searches: routes.searches };
  const complete = completeEvaluation(input, prepared.defense, { ok: true, hauling: routes.hauling, service: routes.service });
  return { ...complete, done: true as const, checkpoint: routes.checkpoint, searches: routes.searches };
}
