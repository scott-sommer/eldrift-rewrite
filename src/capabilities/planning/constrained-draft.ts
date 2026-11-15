import { constrainedFoundation, packConstrainedDraft } from './constrained-foundation';
import { constrainedRoads } from './constrained-roads';
import type { ConstrainedRoadInput } from './constrained-roads';
import type { CoreCandidate } from './standard-candidates';
import { finishDraft } from './finish-draft';
export type ConstrainedDraftInput = Omit<ConstrainedRoadInput, 'entries' | 'storage' | 'anchors'> & { candidate: CoreCandidate };
export function constrainedDraft(input: ConstrainedDraftInput) {
  const attached = constrainedFoundation(input);
  if (!attached.ok) return attached;
  const anchor = input.candidate.anchor;
  const targets = attached.entries.filter(entry => entry.type !== 'road' && entry.type !== 'lab' && entry.type !== 'storage');
  const traffic = constrainedRoads({ ...input, storage: anchor, entries: attached.entries,
    anchors: targets.map(entry => entry.position) });
  if (!traffic.ok) return { ok: false as const, phase: 'roads' as const, details: { ...traffic, destination: targets[Number(traffic.target)] } };
  const packed = packConstrainedDraft(input, { position: attached.controller }, traffic);
  if (!packed.ok) return packed;
  const result = finishDraft({ ...input, storage: anchor, entries: packed.entries,
    anchors: attached.anchors, search: costs => {
      const search = input.search(costs);
      return (start, goal, roads) => search(start, goal, roads, []);
    } });
  if (!result.ok) return result;
  return { ...result, lanes: traffic.lanes, omitted: packed.omitted };
}
