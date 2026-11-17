import { constructionInventory } from './inventory';
type Inventory = ReturnType<typeof constructionInventory>;
import type { PlanEntry } from '../planning/plan-model';
import { validEntry } from '../planning/plan-model';
import { placementKey } from '../planning/dependencies';
import { terrainPlacementFailure } from '../../capabilities/planning/terrain-placement';
import { canShareTile } from '../../capabilities/planning/placement-validation';
import type { ConstructionObservation, ConstructionStatus, ConstructionObject } from './model';
/** Read-only classification. Existing objects precede budgets, preventing double reservation of their slots. */
export function constructionEligibility(entry: PlanEntry, observed: ConstructionObservation): { status: ConstructionStatus; reason: string } {
  return createConstructionClassifier(observed)(entry);
}
export function createConstructionClassifier(source: ConstructionObservation) {
  const inventory = constructionInventory(source);
  return (entry: PlanEntry) => classify(entry, inventory);
}
function classify(entry: PlanEntry, inventory: Inventory) {
  const observed = inventory.observed;
  if (!validEntry(entry, inventory.types)) return result('invalid', 'entry');
  const key = entry.x + ':' + entry.y;
  const structures = objectsAt(inventory.structures, key), sites = objectsAt(inventory.sites, key);
  if (structures.some(item => item.type === entry.type && item.owned)) return result('built', 'present');
  if (sites.some(item => item.type === entry.type && item.owned)) return result('site-existing', 'present');
  const failure = terrainPlacementFailure({ type: entry.type, position: { x: entry.x, y: entry.y } }, observed);
  if (failure) return result('invalid', failure);
  if (entry.rcl > constructionStage(observed)) return result('waiting-for-RCL', 'entry-stage');
  return accessEligibility(entry, observed, structures, sites) ?? budgetEligibility(entry, inventory);
}
function budgetEligibility(entry: PlanEntry, inventory: Inventory) {
  const observed = inventory.observed;
  if (observed.storedEnergy < (entry.minimumStoredEnergy ?? 0)) return result('waiting-for-budget', 'energy-reserve');
  if (!hasStructureCapacity(entry.type, inventory)) return result('waiting-for-RCL', 'structure-limit');
  const roomSites = inventory.roomSites;
  if (!hasSiteCapacity(observed, roomSites)) return result('waiting-for-budget', 'site-limit');
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

function objectsAt(index: ReadonlyMap<string, ConstructionObject[]>, key: string): readonly ConstructionObject[] {
  return index.get(key) ?? [];
}
function hasStructureCapacity(type: string, inventory: Inventory): boolean {
  return (inventory.counts.get(type) ?? 0) < (inventory.observed.limits[type]?.[inventory.observed.level] ?? 0);
}
function hasSiteCapacity(observed: ConstructionObservation, roomSites: number): boolean {
  return roomSites < observed.roomSiteLimit && observed.globalSites < observed.globalSiteLimit;
}

function constructionStage(observed: ConstructionObservation): number { return observed.stageLevel ?? observed.level; }
