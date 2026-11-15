import type { PlanEntry } from '../../src/features/planning/plan-model';
import { createNativePlanningEvaluator } from '../../src/app/native-planning-evaluator';
import { prepareEvaluation } from '../../src/capabilities/planning/evaluate-draft';
import { measure } from './planning-profile';
import { planningObservation } from '../fixtures/planning-observation';
import { measurementInput } from './layout-score-check';
const observation = planningObservation();
const operatorEntries: PlanEntry[] = [{ type: 'storage', x: 25, y: 25, rcl: 4, priority: -777,
  source: 'operator', tag: 'manual-storage', dependencies: [] }];
export const evaluateJobCandidate = createNativePlanningEvaluator({
  room: 'W0N1', observation, observationIdentity: JSON.stringify(observation), policyIdentity: 'fixture-v1',
  searchRevision: 'native-job-v1', versions: { standard: 'fixture-v1', constrained: 'fixture-v1' },
  prepare: measure('prepare', prepareEvaluation), operatorEntries,
  maximumSearches: 1, maximumPathOps: 10000, canContinue: () => true,
  prepareScore: (_candidate, entries) => measurementInput(entries, observation),
});
