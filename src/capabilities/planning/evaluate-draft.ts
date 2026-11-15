import { assessRoom } from './assessment';
import { validateDraft } from './draft-validation';
import { placementFailures } from './placement-validation';
import { draftRouteCosts } from './draft-route-costs';
import type { DraftRouteCostsInput } from './draft-route-costs';
import { footprintCosts } from './footprint-costs';
import type { FootprintCostInput } from './footprint-costs';
import { barrierCost } from './barrier-cost';
import type { BarrierCostInput } from './barrier-cost';
import type { LayoutCosts } from './selection';
export type EvaluateDraftInput = DraftRouteCostsInput &
  Pick<FootprintCostInput, 'desiredCapacity' | 'constructionCost' | 'retirementCost'> & {
    protectedTypes: readonly string[];
    barrierCosts: BarrierCostInput['costs'];
  };
/** Structural and barrier failures never acquire a score. All six dimensions share one draft. */
export function evaluateDraft(input: EvaluateDraftInput) {
  const prepared = prepareEvaluation(input);
  if (!prepared.ok) return prepared;
  const routes = draftRouteCosts(input);
  if (!routes.ok) return { ok: false as const, phase: routes.phase, details: routes };
  return completeEvaluation(input, prepared.defense, routes);
}
export function prepareEvaluation(input: EvaluateDraftInput) {
  const validation = validateDraft({
    assessment: (input.assess ?? assessRoom)(input.observation), entries: input.entries, limits: input.limits,
    constraints: input.observation.constraints, blocksMovement: input.blocksMovement,
    placementFailures: entries => placementFailures(entries, input.observation),
  });
  if (!validation.ok) return validation;
  const defense = barrierCost({
    observation: input.observation, costs: input.barrierCosts,
    barriers: input.entries.filter(entry => ['rampart', 'constructedWall'].includes(entry.type)),
    protectedAssets: input.entries.filter(entry => input.protectedTypes.includes(entry.type)),
  });
  if (!defense.ok) return { ok: false as const, phase: 'defense' as const, details: defense };
  return { ok: true as const, defense };
}
export function completeEvaluation(
  input: EvaluateDraftInput, defense: Extract<ReturnType<typeof barrierCost>, { ok: true }>,
  routes: Extract<ReturnType<typeof draftRouteCosts>, { ok: true }>,
) {
  const footprint = footprintCosts(input);
  const costs: LayoutCosts = { hauling: routes.hauling.total, service: routes.service.total,
    capacityShortfall: footprint.capacityShortfall, swamps: footprint.swamps,
    defense: defense.cost, migration: footprint.migration };
  return { ok: true as const, costs, breakdown: { routes, footprint, defense } };
}
