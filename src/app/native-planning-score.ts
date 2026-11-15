import { nativePlanningLimits } from '../adapters/screeps/planning-limits';
import { planningRoadSearch } from '../adapters/screeps/planning-road-search';
import { createAssessmentCache } from '../capabilities/planning/assessment-cache';
import type { AssessmentInput, FixedObject } from '../capabilities/planning/assessment-model';
import type { BarrierCostInput } from '../capabilities/planning/barrier-cost';
import type { CandidateEvaluatorOptions } from '../features/planning/candidate-evaluator';
import { copyPlain } from '../persistence/plain-data';
export interface NativeScoreOptions {
  maximumPathOps: number; protectedTypes: readonly string[]; barrierCosts: BarrierCostInput['costs'];
  haulingWeights?: Readonly<Record<FixedObject['kind'], number>>;
  serviceWeights?: Readonly<Record<string, number>>;
  desiredCapacity?: Readonly<Record<string, number>>;
  constructionCost?: Readonly<Record<string, number>>;
  retirementCost?: Readonly<Record<string, number>>;
}
/** Defaults use nominal construction energy, not a demolition schedule or terrain-adjusted build estimate. */
export function createNativePlanningScore(room: string, options: NativeScoreOptions) {
  if (!room || !Number.isSafeInteger(options.maximumPathOps) || options.maximumPathOps < 1) throw new Error('Invalid native score search');
  const limits = nativePlanningLimits();
  const policy = scorePolicy(options, limits);
  for (const weights of [policy.barrierCosts, policy.haulingWeights, policy.serviceWeights,
    policy.constructionCost, policy.retirementCost]) validateWeights(weights, false);
  validateWeights(policy.desiredCapacity, true);
  if (!policy.protectedTypes.length) throw new Error('Missing protected structure types');
  const revision = 'native-score-v1:' + JSON.stringify([room, policy.maximumPathOps, policy.protectedTypes,
    ...[policy.barrierCosts, policy.haulingWeights, policy.serviceWeights, policy.desiredCapacity,
      policy.constructionCost, policy.retirementCost, limits].map(canonical)]);
  return { revision, prepare(observed: AssessmentInput): CandidateEvaluatorOptions['prepareScore'] {
    const observation = copyPlain(observed), assess = createAssessmentCache();
    return (candidate, entries) => ({
      ...copyPlain(policy), observation: copyPlain(observation), limits: copyPlain(limits), assess,
      storage: { ...candidate.anchor }, entries: copyPlain(entries),
      hauling: observation.objects.filter(object => policy.haulingWeights[object.kind] > 0)
        .map(object => ({ id: object.id, position: { ...object.position }, weight: policy.haulingWeights[object.kind] })),
      blocksMovement: type => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(type),
      search: costs => planningRoadSearch(room, costs, policy.maximumPathOps),
    });
  } };
}
function canonical(record: Readonly<Record<string, unknown>>): unknown[] {
  return Object.keys(record).sort().map(key => [key, record[key]]);
}
function validateWeights(weights: Readonly<Record<string, number>>, integer: boolean): void {
  if (!Object.values(weights).every(value => Number.isFinite(value) && value >= 0
    && (!integer || Number.isSafeInteger(value)))) throw new Error('Invalid native score weights');
}

function scorePolicy(options: NativeScoreOptions, limits: ReturnType<typeof nativePlanningLimits>) {
  return copyPlain({
    maximumPathOps: options.maximumPathOps, protectedTypes: [...new Set(options.protectedTypes)].sort(),
    barrierCosts: options.barrierCosts, haulingWeights: options.haulingWeights ?? { source: 1, controller: 1, mineral: 1 },
    serviceWeights: options.serviceWeights ?? { spawn: 8, extension: 1 },
    desiredCapacity: options.desiredCapacity ?? desiredCapacity(limits),
    ...inventoryCosts(options),
  });
}

function desiredCapacity(limits: ReturnType<typeof nativePlanningLimits>): Record<string, number> {
  return Object.fromEntries(Object.entries(limits)
    .filter(([type]) => !['road', 'container', 'rampart', 'constructedWall'].includes(type))
    .map(([type, levels]) => [type, levels[8] ?? 0]));
}

function inventoryCosts(options: NativeScoreOptions) {
  return { constructionCost: options.constructionCost ?? CONSTRUCTION_COST,
    retirementCost: options.retirementCost ?? CONSTRUCTION_COST };
}
