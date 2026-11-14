import type { WorkAssessment } from '../../capabilities/work/assessment';
import { movementPosition } from './movement-traffic';
/** Snapshots contain facts and externally supplied exclusions; strategy remains outside the adapter. */
export function observeWorkAssessment(room: Room, blockedSites: ReadonlySet<string> = new Set(), excludedRepairs: ReadonlySet<string> = new Set()): WorkAssessment {
  const controller = room.controller;
  return {
    sites: room.find(FIND_MY_CONSTRUCTION_SITES).map(site => ({ id: site.id, position: movementPosition(site.pos), type: site.structureType,
      progress: site.progress, total: site.progressTotal, ready: !blockedSites.has(site.id) })),
    structures: room.find(FIND_STRUCTURES).filter(item => Number.isFinite(item.hits) && Number.isFinite(item.hitsMax) && item.hitsMax > 0).map(item => ({ id: item.id, position: movementPosition(item.pos),
      type: item.structureType, hits: item.hits, maximum: item.hitsMax, eligible: !('my' in item) || item.my,
      excluded: excludedRepairs.has(item.id) })),
    ...(controller ? { controller: { id: controller.id, position: movementPosition(controller.pos), owned: controller.my,
      level: controller.level, downgrade: controller.ticksToDowngrade } } : {}),
  };
}
