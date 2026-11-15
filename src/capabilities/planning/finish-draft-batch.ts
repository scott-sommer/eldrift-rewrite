import { prepareDraftRoads, completeDraftRoads } from './finish-draft';
import type { FinishDraftInput } from './finish-draft';
import { connectRoadBatch } from './road-connection-batch';
import type { RoadCheckpoint } from './road-checkpoint';
export function finishDraftBatch(
  input: FinishDraftInput, searchRevision: string, checkpoint: RoadCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  const prepared = prepareDraftRoads(input);
  const revision = JSON.stringify([searchRevision, input.entries, input.observation, input.limits, prepared.costs]);
  const batch = connectRoadBatch(prepared.roads, revision, checkpoint, maximumSearches, canContinue);
  if (!batch.ok) return { ok: false as const, phase: 'roads' as const, details: batch };
  if (!batch.done) return { ok: true as const, done: false as const, checkpoint: batch.checkpoint, searches: batch.searches };
  const complete = completeDraftRoads(input, prepared.assessment, { ok: true, ...batch.checkpoint });
  if (!complete.ok) return complete;
  return { ...complete, done: true as const, checkpoint: batch.checkpoint, searches: batch.searches };
}
