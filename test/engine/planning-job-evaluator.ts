import { standardDraftBatch } from '../../src/capabilities/planning/standard-draft-batch';
import { constrainedDraftBatch } from '../../src/capabilities/planning/constrained-draft-batch';
import type { ConstrainedDraftCheckpoint } from '../../src/capabilities/planning/constrained-draft-batch';
import type { RoadCheckpoint } from '../../src/capabilities/planning/road-checkpoint';
import type { StagedTile } from '../../src/capabilities/planning/template';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { createAssessmentCache } from '../../src/capabilities/planning/assessment-cache';
import type { PlanningCandidate, CandidateStep } from '../../src/features/planning/planning-job-model';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
import { measurementInput, scoredProposal } from './layout-score-check';
import { evaluateDraftBatch } from '../../src/capabilities/planning/evaluate-draft-batch';
import type { DraftRouteCheckpoint } from '../../src/capabilities/planning/draft-route-batch';
const assess = createAssessmentCache();
type Progress = { phase: 'draft'; checkpoint: RoadCheckpoint | ConstrainedDraftCheckpoint }
  | { phase: 'score'; entries: StagedTile[]; checkpoint?: DraftRouteCheckpoint };
export function evaluateJobCandidate(candidate: PlanningCandidate, saved: unknown): CandidateStep {
  const progress = saved as Progress | undefined;
  const observation = planningObservation();
  if (progress?.phase === 'score') return measureCandidate(candidate, progress);
  const input = { candidate, observation, limits: planningLimits, assess,
    blocksMovement: (type: string) => OBSTACLE_OBJECT_TYPES.some(item => item === type),
    search: (costs: readonly number[]) => planningRoadSearch('W0N1', costs, 10000) };
  const result = candidate.strategy === 'standard'
    ? standardDraftBatch(input, 'native-job-v1', progress?.checkpoint as RoadCheckpoint | undefined, 1)
    : constrainedDraftBatch(input, 'native-job-v1', progress?.checkpoint as ConstrainedDraftCheckpoint | undefined, 1);
  if (!result.ok) return { status: 'rejected', reason: JSON.stringify(result) };
  return { status: 'pending', checkpoint: result.done
    ? { phase: 'score', entries: result.entries }
    : { phase: 'draft', checkpoint: result.checkpoint } };
}

function measureCandidate(candidate: PlanningCandidate, progress: Extract<Progress, { phase: 'score' }>): CandidateStep {
  const input = measurementInput(progress.entries, planningObservation());
  const result = evaluateDraftBatch(input, 'native-score-v1', progress.checkpoint, 1);
  if (!result.ok) return { status: 'rejected', reason: JSON.stringify(result) };
  if (!result.done) return { status: 'pending', checkpoint: { ...progress, checkpoint: result.checkpoint } };
  return { status: 'complete', proposal: scoredProposal(candidate.strategy, input, result.costs) };
}
