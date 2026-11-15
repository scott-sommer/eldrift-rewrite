import { stageConstrainedCore } from './constrained-core';
import { attachInfrastructure } from './attach-infrastructure';
import { placementFailures } from './placement-validation';
import { packCompactServices } from './service-packing';
import { serviceCandidates } from './service-candidates';
import { tileIndex } from '../../core/geometry/local-grid';
import type { ConstrainedDraftInput } from './constrained-draft';
import type { constrainedRoads } from './constrained-roads';

export function constrainedFoundation(input: ConstrainedDraftInput) {
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
  return { ...attached, controller: controller.position };
}
export function packConstrainedDraft(
  input: ConstrainedDraftInput, controller: { position: { x: number; y: number } },
  traffic: Extract<ReturnType<typeof constrainedRoads>, { ok: true }>,
) {
  const excluded = new Set(input.observation.constraints.filter(item => item.kind !== 'locked').map(item => tileIndex(item.position)));
  const packed = packCompactServices({
    storage: input.candidate.anchor, controller: controller.position, limits: input.limits,
    reserved: traffic.entries.map(entry => entry.position),
    candidates: serviceCandidates(input.candidate.anchor, traffic.usableRoads, tile => !excluded.has(tileIndex(tile))),
    canPlace: (type, position) => placementFailures([{ type, position }], input.observation).length === 0,
  });
  if (!packed.ok) return { ok: false as const, phase: 'services' as const, details: packed };
  return { ok: true as const, entries: [...traffic.entries, ...packed.entries], omitted: packed.omitted };
}
