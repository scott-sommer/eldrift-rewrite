import { constrainedFoundation, packConstrainedDraft } from './constrained-foundation';
import type { ConstrainedDraftInput } from './constrained-draft';
import { constrainedRoadBatch } from './constrained-road-batch';
import type { ConstrainedRoadCheckpoint } from './constrained-road-batch';
import { finishDraftBatch } from './finish-draft-batch';
import type { RoadCheckpoint } from './road-checkpoint';
export interface ConstrainedDraftCheckpoint { version: 1; roads: ConstrainedRoadCheckpoint; final?: RoadCheckpoint }
export function constrainedDraftBatch(
  input: ConstrainedDraftInput, revision: string, previous: ConstrainedDraftCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  if (previous && previous.version !== 1) throw new Error('Invalid constrained draft checkpoint');
  const attached = constrainedFoundation(input);
  if (!attached.ok) return attached;
  const anchor = input.candidate.anchor;
  const targets = attached.entries.filter(entry => entry.type !== 'road' && entry.type !== 'lab' && entry.type !== 'storage');
  const traffic = constrainedRoadBatch({ ...input, storage: anchor, entries: attached.entries,
    anchors: targets.map(entry => entry.position) }, revision, previous?.roads, maximumSearches, canContinue);
  if (!traffic.ok) return { ok: false as const, phase: 'roads' as const, details: traffic };
  const checkpoint: ConstrainedDraftCheckpoint = { version: 1, roads: traffic.checkpoint };
  if (!traffic.done) {
    if (previous?.final) throw new Error('Premature final road checkpoint');
    return { ok: true as const, done: false as const, checkpoint, searches: traffic.searches };
  }
  const packed = packConstrainedDraft(input, { position: attached.controller }, traffic);
  if (!packed.ok) return packed;
  const result = finishDraftBatch({ ...input, storage: anchor, entries: packed.entries,
    anchors: attached.anchors, search: costs => {
      const search = input.search(costs);
      return (start, goal, roads) => search(start, goal, roads, []);
    } }, revision, previous?.final, maximumSearches - traffic.searches, canContinue);
  if (!result.ok) return result;
  checkpoint.final = result.checkpoint;
  const searches = traffic.searches + result.searches;
  if (!result.done) return { ok: true as const, done: false as const, checkpoint, searches };
  return { ...result, checkpoint, searches, lanes: traffic.lanes, omitted: packed.omitted };
}
