import { stageConstrainedCore } from './constrained-core';
import { attachInfrastructure } from './attach-infrastructure';
import { constrainedRoads } from './constrained-roads';
import type { ConstrainedRoadInput } from './constrained-roads';
import type { CoreCandidate } from './standard-candidates';
import { placementFailures } from './placement-validation';
import { packCompactServices } from './service-packing';
import { serviceCandidates } from './service-candidates';
import { finishDraft } from './finish-draft';
import { tileIndex } from '../../core/geometry/local-grid';
export type ConstrainedDraftInput = Omit<ConstrainedRoadInput, 'entries' | 'storage' | 'anchors'> & { candidate: CoreCandidate };
export function constrainedDraft(input: ConstrainedDraftInput) {
  const controller = input.observation.objects.find(item => item.kind === 'controller');
  if (!controller) return { ok: false as const, phase: 'controller' as const, details: 'missing-controller' };
  const { anchor, transform } = input.candidate;
  const core = stageConstrainedCore(anchor, transform, input.limits);
  if (!core) return { ok: false as const, phase: 'footprint' as const, details: input.candidate };
  const placement = placementFailures(core, input.observation);
  if (placement.length) return { ok: false as const, phase: 'placement' as const, details: placement };
  const attached = attachInfrastructure(core, anchor, input.observation, input.limits);
  if (!attached.ok) return { ok: false as const, phase: 'capacity' as const, details: attached.failure };
  if (attached.missing.length) return { ok: false as const, phase: 'infrastructure' as const, details: attached.missing };
  const targets = attached.entries.filter(entry => entry.type !== 'road' && entry.type !== 'lab' && entry.type !== 'storage');
  const traffic = constrainedRoads({ ...input, storage: anchor, entries: attached.entries,
    anchors: targets.map(entry => entry.position) });
  if (!traffic.ok) return { ok: false as const, phase: 'roads' as const, details: { ...traffic, destination: targets[Number(traffic.target)] } };
  const excluded = new Set(input.observation.constraints.filter(item => item.kind !== 'locked').map(item => tileIndex(item.position)));
  const packed = packCompactServices({
    storage: anchor, controller: controller.position, limits: input.limits,
    reserved: traffic.entries.map(entry => entry.position),
    candidates: serviceCandidates(anchor, traffic.usableRoads, tile => !excluded.has(tileIndex(tile))),
    canPlace: (type, position) => placementFailures([{ type, position }], input.observation).length === 0,
  });
  if (!packed.ok) return { ok: false as const, phase: 'services' as const, details: packed };
  const result = finishDraft({ ...input, storage: anchor, entries: [...traffic.entries, ...packed.entries],
    anchors: attached.anchors, search: costs => {
      const search = input.search(costs);
      return (start, goal, roads) => search(start, goal, roads, []);
    } });
  if (!result.ok) return result;
  return { ...result, lanes: traffic.lanes, omitted: packed.omitted };
}
