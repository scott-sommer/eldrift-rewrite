import type { StampReplayCache } from '../../capabilities/planning/stamp-replay-cache';
import { createStampLayoutStrategy } from './stamp-layout-strategy';
import type { StampStrategyOptions } from './stamp-layout-strategy';
import { createOperatorDraftAmendment } from './operator-draft';
import type { PlanEntry } from './plan-model';
import { standardDraftBatch } from '../../capabilities/planning/standard-draft-batch';
import { constrainedDraftBatch } from '../../capabilities/planning/constrained-draft-batch';
import type { ConstrainedDraftInput } from '../../capabilities/planning/constrained-draft';
import type { ConstrainedDraftCheckpoint } from '../../capabilities/planning/constrained-draft-batch';
import type { RoadCheckpoint } from '../../capabilities/planning/road-checkpoint';
import type { StagedTile } from '../../capabilities/planning/template';
import type { PlanningCandidate } from './planning-job-model';
export type StrategyStep =
  | { status: 'pending'; checkpoint: unknown }
  | { status: 'rejected'; reason: string }
  | { status: 'complete'; entries: StagedTile[] };
export interface LayoutStrategy {
  version: string;
  advance(candidate: PlanningCandidate, revision: string, checkpoint: unknown, searches: number, canContinue: () => boolean): StrategyStep;
}
/** Explicit strategy adapters; adding a strategy does not change the candidate evaluator. */
export function createLayoutStrategies(
  input: Omit<ConstrainedDraftInput, 'candidate'>, versions: { standard: string; constrained: string; stamps?: string },
  operatorEntries: readonly PlanEntry[] = [],
  stampOptions: StampStrategyOptions = { anchorLimit: 200, attemptsPerStep: 100, totalAttempts: 100000 },
  stampReplayCache?: StampReplayCache,
): Readonly<Record<string, LayoutStrategy>> {
  if (operatorEntries.length) input = { ...input, amendDraft: createOperatorDraftAmendment(operatorEntries) };
  return {
    ...(versions.stamps ? { stamps: createStampLayoutStrategy({ ...input, search: costs => {
      const search = input.search(costs);
      return (start, goal, roads) => search(start, goal, roads, []);
    } }, versions.stamps, operatorEntries, stampOptions, stampReplayCache) } : {}),
    standard: { version: versions.standard, advance: (candidate, revision, checkpoint, searches, guard) =>
      strategyStep(standardDraftBatch({ ...input, candidate, search: costs => {
        const search = input.search(costs);
        return (start, goal, roads) => search(start, goal, roads, []);
      } }, revision, checkpoint as RoadCheckpoint | undefined, searches, guard)) },
    constrained: { version: versions.constrained, advance: (candidate, revision, checkpoint, searches, guard) =>
      strategyStep(constrainedDraftBatch({ ...input, candidate }, revision, checkpoint as ConstrainedDraftCheckpoint | undefined, searches, guard)) },
  };
}
function strategyStep(result: ReturnType<typeof standardDraftBatch> | ReturnType<typeof constrainedDraftBatch>): StrategyStep {
  if (!result.ok) return { status: 'rejected', reason: JSON.stringify(result) };
  return result.done ? { status: 'complete', entries: result.entries } : { status: 'pending', checkpoint: result.checkpoint };
}
