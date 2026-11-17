import { copyPlain } from '../../persistence/plain-data';
import type { ConstructionObservation, ConstructionObject } from './model';
/** A cycle owns one detached snapshot and indexes; callers must rebuild after observations change. */
export function constructionInventory(source: ConstructionObservation) {
  const { completed, temporarilyOccupied, ...plain } = source;
  const observed = { ...copyPlain(plain), completed: new Set(completed), temporarilyOccupied: new Set(temporarilyOccupied) };
  validateObservation(observed);
  const structures = uniqueObjects(observed.structures), sites = uniqueObjects(observed.sites);
  const counts = new Map<string, number>();
  for (const item of uniqueObjects([...structures, ...sites])) {
    if (item.owned) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return { observed, types: new Set(Object.keys(observed.limits)), structures: byPosition(structures), sites: byPosition(sites),
    counts, roomSites: sites.filter(item => item.owned).length };
}
function uniqueObjects(objects: readonly ConstructionObject[]): ConstructionObject[] {
  const indexed = new Map<string, ConstructionObject>();
  for (const item of objects) {
    validateObject(item);
    const previous = indexed.get(item.id);
    if (previous && [previous.type !== item.type, previous.x !== item.x, previous.y !== item.y, previous.owned !== item.owned].some(Boolean)) {
      throw new Error('Conflicting construction object identity');
    }
    indexed.set(item.id, item);
  }
  return [...indexed.values()];
}
function byPosition(objects: readonly ConstructionObject[]): Map<string, ConstructionObject[]> {
  const indexed = new Map<string, ConstructionObject[]>();
  for (const item of objects) {
    const key = item.x + ':' + item.y, values = indexed.get(key) ?? [];
    values.push(item); indexed.set(key, values);
  }
  return indexed;
}
function validateObject(item: ConstructionObject): void {
  if (!item.id || !item.type || typeof item.owned !== 'boolean' || ![item.x, item.y].every(value => integer(value) && value < 50)) {
    throw new Error('Invalid construction object');
  }
}
function validateObservation(observed: ConstructionObservation): void {
  validateEconomy(observed);
  if (![observed.globalSites, observed.globalSiteLimit, observed.roomSiteLimit].every(integer)) throw new Error('Invalid construction site budget');
  if (observed.terrain.length !== 2500 || !observed.terrain.every(cell => ['plain', 'swamp', 'wall'].includes(cell))) throw new Error('Invalid construction terrain');
  for (const levels of Object.values(observed.limits)) {
    if (levels.length !== 9 || !levels.every(integer)) throw new Error('Invalid construction RCL limits');
  }
}
function integer(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }

function validateEconomy(observed: ConstructionObservation): void {
  if (!integer(observed.level) || observed.level > 8 || !Number.isFinite(observed.storedEnergy) || observed.storedEnergy < 0) {
    throw new Error('Invalid construction economy');
  }
}
