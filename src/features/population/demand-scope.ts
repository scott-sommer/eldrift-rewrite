import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { SpawnRequest } from '../../capabilities/spawning/request';
/** Other producers retain cancellation authority; their live pending births still cover population demand. */
export function demandScope(units: readonly PopulationUnit[], pending: readonly SpawnRequest[], tick: number, external?: (request: SpawnRequest) => boolean) {
  if (!external) return { units,pending };
  const ownedElsewhere = pending.filter(external), names = new Set(units.map(unit => unit.name));
  const reserved = ownedElsewhere.filter(request => request.expiresAt > tick && !names.has(request.name)).map(request => ({ name: request.name,owner: request.owner,room: request.home ?? request.room,spawning: true,ticksToLive: 0 }));
  return { units: [...units,...reserved],pending: pending.filter(request => !external(request)) };
}
