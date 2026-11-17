import type { PlanEntry } from '../planning/plan-model';
import { validEntry } from '../planning/plan-model';
import { placementKey } from '../planning/dependencies';
import { terrainPlacementFailure } from '../../capabilities/planning/terrain-placement';
import { canShareTile } from '../../capabilities/planning/placement-validation';
import type { ConstructionObservation, ConstructionStatus, ConstructionObject } from './model';
/** Read-only classification. Existing objects precede budgets, preventing double reservation of their slots. */
export function constructionEligibility(entry: PlanEntry, observed: ConstructionObservation): { status: ConstructionStatus; reason: string } {
  if (!validEntry(entry, new Set(Object.keys(observed.limits)))) return result('invalid', 'entry');
  const structures = observed.structures.filter(item => item.x === entry.x && item.y === entry.y);
  const sites = observed.sites.filter(item => item.x === entry.x && item.y === entry.y);
  if (structures.some(item => item.type === entry.type && item.owned)) return result('built', 'present');
  if (sites.some(item => item.type === entry.type && item.owned)) return result('site-existing', 'present');
  const failure = terrainPlacementFailure({ type: entry.type, position: { x: entry.x, y: entry.y } }, observed);
  if (failure) return result('invalid', failure);
  if (entry.rcl > observed.level) return result('waiting-for-RCL', 'entry-stage');
  return accessEligibility(entry, observed, structures, sites) ?? budgetEligibility(entry, observed);
}
function budgetEligibility(entry: PlanEntry, observed: ConstructionObservation) {
  if (observed.storedEnergy < (entry.minimumStoredEnergy ?? 0)) return result('waiting-for-budget', 'energy-reserve');
  const capacity = observed.limits[entry.type]?.[observed.level] ?? 0;
  const count = new Set([...observed.structures, ...observed.sites].filter(item => item.owned && item.type === entry.type)
    .map(item => item.id)).size;
  if (count >= capacity) return result('waiting-for-RCL', 'structure-limit');
  const roomSites = new Set(observed.sites.filter(item => item.owned).map(item => item.id)).size;
  if (roomSites >= observed.roomSiteLimit || observed.globalSites >= observed.globalSiteLimit) return result('waiting-for-budget', 'site-limit');
  return result('eligible', placementKey(entry));
}
function result(status: ConstructionStatus, reason: string) { return { status, reason }; }

function accessEligibility(entry: PlanEntry, observed: ConstructionObservation,
  structures: readonly ConstructionObject[], sites: readonly ConstructionObject[]) {
  if (structures.some(item => !canShareTile(item.type, entry.type))) return result('temporarily-blocked', 'structure-conflict');
  if (sites.length || observed.temporarilyOccupied.has(entry.x + ':' + entry.y)) return result('temporarily-blocked', 'occupied');
  if ((entry.dependencies ?? []).some(key => !observed.completed.has(key))) return result('temporarily-blocked', 'dependency');
  return undefined;
}
