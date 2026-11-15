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
import { measuredProposal } from './layout-score-check';
const assess = createAssessmentCache();
type Progress = { phase: 'draft'; checkpoint: RoadCheckpoint | ConstrainedDraftCheckpoint }
  | { phase: 'score'; entries: StagedTile[] };
export function evaluateJobCandidate(candidate: PlanningCandidate, saved: unknown): CandidateStep {
  const progress = saved as Progress | undefined;
  const observation = planningObservation();
  if (progress?.phase === 'score') return { status: 'complete', proposal: measuredProposal(candidate.strategy, progress.entries, observation) };
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
