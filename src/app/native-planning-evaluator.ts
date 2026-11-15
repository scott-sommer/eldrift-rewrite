import type { InfrastructureProvider } from '../capabilities/planning/infrastructure-cache';
import type { StampReplayCache } from '../capabilities/planning/stamp-replay-cache';
import { nativePlanningLimits } from '../adapters/screeps/planning-limits';
import { createCandidateEvaluator } from '../features/planning/candidate-evaluator';
import type { CandidateEvaluatorOptions } from '../features/planning/candidate-evaluator';
import { createLayoutStrategies } from '../features/planning/layout-strategies';
import type { AssessmentProvider } from '../capabilities/planning/assessment-cache';
import { createAssessmentCache } from '../capabilities/planning/assessment-cache';
import { createEvaluationCache } from '../capabilities/planning/evaluation-cache';
import { prepareEvaluation } from '../capabilities/planning/evaluate-draft';
import type { AssessmentInput } from '../capabilities/planning/assessment-model';
import type { PlanEntry } from '../features/planning/plan-model';
import { planningRoadSearch } from '../adapters/screeps/planning-road-search';
import type { StampStrategyOptions } from '../features/planning/stamp-layout-strategy';
export interface NativePlanningEvaluatorOptions {
  assess?: AssessmentProvider;
  attach?: InfrastructureProvider;
  stampOptions?: StampStrategyOptions;
  stampReplayCache?: StampReplayCache;
  room: string; observation: AssessmentInput; observationIdentity: string; policyIdentity: string;
  operatorEntries: readonly PlanEntry[];
  versions: { standard: string; constrained: string; stamps?: string }; searchRevision: string;
  maximumSearches: number; maximumPathOps: number; canContinue: () => boolean;
  prepareScore: CandidateEvaluatorOptions['prepareScore'];
  prepare?: typeof prepareEvaluation;
}
/** Native mechanics are composed here; scoring and defensive-layout policy remain explicit inputs. */
export function createNativePlanningEvaluator(options: NativePlanningEvaluatorOptions) {
  const limits = nativePlanningLimits();
  return createCandidateEvaluator({
    observation: options.observationIdentity, policy: options.policyIdentity, searchRevision: options.searchRevision,
    operatorEntries: options.operatorEntries, maximumSearches: options.maximumSearches,
    canContinue: options.canContinue, tick: () => Game.time,
    prepare: createEvaluationCache(options.prepare ?? prepareEvaluation),
    strategies: createLayoutStrategies({
      observation: options.observation, limits, assess: options.assess ?? createAssessmentCache(),
      blocksMovement: type => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(type),
      search: costs => planningRoadSearch(options.room, costs, options.maximumPathOps),
    }, options.versions, options.operatorEntries, options.stampOptions, options.stampReplayCache, options.attach),
    prepareScore: options.prepareScore,
  });
}
