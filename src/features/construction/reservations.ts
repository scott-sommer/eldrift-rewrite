import type { PlanEntry } from '../planning/plan-model';
import { placementKey } from '../planning/dependencies';
import type { ConstructionObservation } from './model';
/** Add only accepted requests not yet reflected in a consistent room/global observation. */
export function reservedConstructionObservation(observed: ConstructionObservation, reserved: readonly PlanEntry[]): ConstructionObservation {
  const present = new Set([...observed.structures, ...observed.sites].filter(item => item.owned).map(placementKey));
  const pending = reserved.filter(entry => !present.has(placementKey(entry)));
  return { ...observed, globalSites: observed.globalSites + pending.length,
    sites: [...observed.sites, ...pending.map(entry => ({ id: 'construction-reservation:' + placementKey(entry),
      type: entry.type, x: entry.x, y: entry.y, owned: true }))] };
}
