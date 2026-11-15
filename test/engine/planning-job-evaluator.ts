import { createCandidateEvaluator } from '../../src/features/planning/candidate-evaluator';
import { createLayoutStrategies } from '../../src/features/planning/layout-strategies';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { createAssessmentCache } from '../../src/capabilities/planning/assessment-cache';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
import { measurementInput } from './layout-score-check';
const observation = planningObservation();
export const evaluateJobCandidate = createCandidateEvaluator({
  observation: JSON.stringify(observation), policy: 'fixture-v1', searchRevision: 'native-job-v1',
  maximumSearches: 1, canContinue: () => true, tick: () => Game.time,
  strategies: createLayoutStrategies({ observation, limits: planningLimits, assess: createAssessmentCache(),
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(item => item === type),
    search: costs => planningRoadSearch('W0N1', costs, 10000),
  }, { standard: 'fixture-v1', constrained: 'fixture-v1' }),
  prepareScore: (_candidate, entries) => measurementInput(entries, observation),
});
