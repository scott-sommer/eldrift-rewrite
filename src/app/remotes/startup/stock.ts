import { logisticsPool } from '../../../capabilities/logistics/request';
import { peekState } from '../../../persistence/versioned-state';
import { quantitySchema } from '../../../persistence/quantities/schema';
import type { StatePort } from '../../../persistence/versioned-state';
import type { StartupStructures } from './model';
/** Read-only view of current stock; never creates a second claim or credits worker cargo. */
export function startupHomeStock(state: StatePort, structures: StartupStructures, home: Room, claims = startupClaimedPools(state)) {
  const spawnEnergy = structures.availableEnergy(home.name,home.energyAvailable);
  const totalEnergy = spawnEnergy+(home.storage?.store.energy ?? 0)+(home.terminal?.store.energy ?? 0);
  const pools = new Set(home.find(FIND_MY_STRUCTURES).filter(item => ['spawn','extension','storage','terminal'].includes(item.structureType)).map(item => logisticsPool('stock',item.id,'energy')));
  const claimedEnergy = [...pools].reduce((sum,pool) => sum+(claims.get(pool) ?? 0),0);
  return { totalEnergy,claimedEnergy,availableEnergy: Math.max(0,totalEnergy-claimedEnergy),spawnEnergy,spawnCapacity: home.energyCapacityAvailable };
}

export function startupClaimedPools(state: StatePort): ReadonlyMap<string,number> {
  const claims = peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? [];
  const amounts = new Map<string,number>();
  for (const claim of claims.filter(claim => claim.expiresAt > Game.time)) {
    for (const allocation of claim.allocations) amounts.set(allocation.pool,(amounts.get(allocation.pool) ?? 0)+allocation.amount);
  }
  return amounts;
}
