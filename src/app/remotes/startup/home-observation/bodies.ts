import { observePaidHomeInventory } from './inventory';
import type { PaidHomeBody } from './model';
/** SDK capacities include boosts, damaged body capacity and mixed cargo; never derive these from a paid template. */
export function observePaidHomeBodies(roster: readonly Creep[]): PaidHomeBody[] {
  return roster.map(creep => ({ name: creep.name,unit: creep.id,inventory: observePaidHomeInventory(creep) }))
    .sort((a,b) => a.name.localeCompare(b.name));
}
