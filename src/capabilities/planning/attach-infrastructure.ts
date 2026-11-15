import { adjacentTiles, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { AssessmentInput } from './assessment-model';
import type { CorePlacement, StructureLimits } from './core-model';
import { assessRoom } from './assessment';
import { placementFailures } from './placement-validation';
import { resourceInfrastructure } from './resource-infrastructure';
import { auxiliaryInfrastructure } from './auxiliary-infrastructure';
import { scheduleCapacity } from './capacity-scheduling';
export function attachInfrastructure(
  core: readonly CorePlacement[], storage: Tile, observation: AssessmentInput, limits: StructureLimits,
) {
  const assessment = assessRoom(observation);
  const excluded = new Set(observation.constraints.filter(item => item.kind !== 'locked').map(item => tileIndex(item.position)));
  const observedRoads = new Set(observation.infrastructure.filter(item => item.type === 'road').map(item => tileIndex(item.position)));
  const context = {
    storage, reserved: core.map(entry => entry.position),
    available: (type: string, position: Tile) => !excluded.has(tileIndex(position))
      && placementFailures([{ type, position }], observation).length === 0,
    adjacentRoads: (position: Tile) => adjacentTiles(position).filter(tile => observedRoads.has(tileIndex(tile))).length,
    open: (position: Tile) => assessment.walkable[tileIndex(position)]!,
  };
  const resources = resourceInfrastructure({ ...context, objects: observation.objects });
  const auxiliary = auxiliaryInfrastructure({
    ...context, reserved: [...context.reserved, ...resources.entries.map(entry => entry.position)],
  });
  const proposals = [...resources.entries, ...auxiliary.entries];
  const scheduled = scheduleCapacity(proposals, core, limits);
  if (!scheduled.ok) return { ok: false as const, reason: 'capacity' as const, failure: scheduled };
  return { ok: true as const,
    entries: [...core.map(entry => ({ ...entry, position: { ...entry.position } })), ...scheduled.entries],
    missing: [...resources.missing, ...auxiliary.missing],
    anchors: scheduled.entries.map(entry => ({ ...entry.position })),
  };
}
