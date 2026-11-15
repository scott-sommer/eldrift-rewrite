import { createCandidateEvaluator } from '../features/planning/candidate-evaluator';
import type { CandidateEvaluatorOptions } from '../features/planning/candidate-evaluator';
import { createLayoutStrategies } from '../features/planning/layout-strategies';
import { createAssessmentCache } from '../capabilities/planning/assessment-cache';
import { createEvaluationCache } from '../capabilities/planning/evaluation-cache';
import { prepareEvaluation } from '../capabilities/planning/evaluate-draft';
import type { AssessmentInput } from '../capabilities/planning/assessment-model';
import type { PlanEntry } from '../features/planning/plan-model';
import { planningRoadSearch } from '../adapters/screeps/planning-road-search';
export interface NativePlanningEvaluatorOptions {
  room: string; observation: AssessmentInput; observationIdentity: string; policyIdentity: string;
  operatorEntries: readonly PlanEntry[];
  versions: { standard: string; constrained: string }; searchRevision: string;
  maximumSearches: number; maximumPathOps: number; canContinue: () => boolean;
  prepareScore: CandidateEvaluatorOptions['prepareScore'];
  prepare?: typeof prepareEvaluation;
}
/** Native mechanics are composed here; scoring and defensive-layout policy remain explicit inputs. */
export function createNativePlanningEvaluator(options: NativePlanningEvaluatorOptions) {
  const limits = Object.fromEntries(Object.entries(CONTROLLER_STRUCTURES).map(([type, levels]) =>
    [type, Array.from({ length: 9 }, (_, level) => levels[level] ?? 0)]));
  return createCandidateEvaluator({
    observation: options.observationIdentity, policy: options.policyIdentity, searchRevision: options.searchRevision,
    operatorEntries: options.operatorEntries, maximumSearches: options.maximumSearches,
    canContinue: options.canContinue, tick: () => Game.time,
    prepare: createEvaluationCache(options.prepare ?? prepareEvaluation),
    strategies: createLayoutStrategies({
      observation: options.observation, limits, assess: createAssessmentCache(),
      blocksMovement: type => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(type),
      search: costs => planningRoadSearch(options.room, costs, options.maximumPathOps),
    }, options.versions, options.operatorEntries),
    prepareScore: options.prepareScore,
  });
}
