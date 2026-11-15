import { standardDraftFoundation } from './standard-draft';
import type { StandardDraftInput } from './standard-draft';
import { finishDraftBatch } from './finish-draft-batch';
import type { RoadCheckpoint } from './road-checkpoint';
export function standardDraftBatch(
  input: StandardDraftInput, searchRevision: string, checkpoint: RoadCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  const foundation = standardDraftFoundation(input);
  if (!foundation.ok) return foundation;
  return finishDraftBatch({ ...input, storage: input.candidate.anchor, entries: foundation.entries, anchors: foundation.anchors },
    searchRevision, checkpoint, maximumSearches, canContinue);
}
