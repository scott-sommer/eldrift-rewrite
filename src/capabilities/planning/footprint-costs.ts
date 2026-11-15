import { tileIndex } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
import type { AssessmentInput } from './assessment-model';
export interface FootprintCostInput {
  entries: readonly PlacedTile[];
  observation: AssessmentInput;
  desiredCapacity: Readonly<Record<string, number>>;
  constructionCost: Readonly<Record<string, number>>;
  retirementCost: Readonly<Record<string, number>>;
}
/** Physical inventory metrics only; unretained assets are reported, never scheduled for demolition. */
export function footprintCosts(input: FootprintCostInput) {
  const planned = unique(input.entries);
  const observed = new Map(input.observation.infrastructure.filter(entry => entry.owned || ['road', 'container'].includes(entry.type))
    .map(entry => [key(entry), entry]));
  const additions = planned.filter(entry => !observed.has(key(entry)));
  const retained = new Set(planned.map(key));
  const fixed = new Set(input.observation.objects.map(entry => entry.id));
  const unretained = input.observation.infrastructure.filter(entry => entry.owned && !fixed.has(entry.id) && !retained.has(key(entry)));
  const shortfalls = Object.entries(input.desiredCapacity).map(([type, desired]) => {
    if (!Number.isSafeInteger(desired) || desired < 0) throw new Error('Invalid desired capacity');
    const actual = planned.filter(entry => entry.type === type).length;
    return { type, desired, actual, missing: Math.max(0, desired - actual) };
  });
  if (input.observation.terrain.length !== 2500) throw new Error('Invalid measurement terrain');
  const swampTiles = [...new Set(planned.map(entry => tileIndex(entry.position)))]
    .filter(index => input.observation.terrain[index] === 'swamp').sort((a, b) => a - b);
  const construction = weightedInventory(additions, input.constructionCost);
  const retirement = weightedInventory(unretained, input.retirementCost);
  const migration = construction + retirement;
  if (!Number.isFinite(migration)) throw new Error('Migration cost overflow');
  return { capacityShortfall: shortfalls.reduce((sum, item) => sum + item.missing, 0), shortfalls,
    swamps: swampTiles.length, swampTiles, migration, construction, retirement,
    additions: additions.map(key).sort(), unretained: unretained.map(entry => entry.id).sort() };
}
function key(entry: PlacedTile): string { return entry.type + ':' + tileIndex(entry.position); }
function unique(entries: readonly PlacedTile[]): PlacedTile[] {
  const keys = entries.map(key);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate measured placement');
  return [...entries];
}
function weightedInventory(entries: readonly PlacedTile[], weights: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const entry of entries) {
    const weight = Object.hasOwn(weights, entry.type) ? weights[entry.type] : undefined;
    if (weight === undefined || !Number.isFinite(weight) || weight < 0) throw new Error('Missing or invalid inventory weight: ' + entry.type);
    total += weight;
  }
  if (!Number.isFinite(total)) throw new Error('Inventory cost overflow');
  return total;
}
