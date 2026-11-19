import { forecastStartupCash } from '../../../capabilities/economy/startup/cash';
import { logisticsPool } from '../../../capabilities/logistics/request';
import { peekState } from '../../../persistence/versioned-state';
import { quantitySchema } from '../../../persistence/quantities/schema';
import type { StatePort } from '../../../persistence/versioned-state';
import type { StartupStructures } from './model';
/** Read existing stock and native admission claims. No projected income funds current births. */
export function startupCapitalAllows(state: StatePort, structures: StartupStructures, home: Room, reserve: number, cost: number, committed: number): boolean {
  const stock = structures.availableEnergy(home.name,home.energyAvailable)+(home.storage?.store.energy ?? 0)+(home.terminal?.store.energy ?? 0);
  const homeEnergy = Math.max(0,stock-claimedEnergy(state,home));
  const forecast = forecastStartupCash({ homeEnergy,protectedEnergy: reserve,horizon: 0,readyAt: 0,selfHarvestedConstruction: 0,
    flows: [{ id: 'current',kind: 'birth',energy: cost,firstTick: 0,interval: null,occurrences: 1 },
      { id: 'courier-commitment',kind: 'birth',energy: committed,firstTick: 0,interval: null,occurrences: 1 }] });
  return forecast.homeShortfall === 0;
}
function claimedEnergy(state: StatePort, home: Room): number {
  const pools = new Set(home.find(FIND_MY_STRUCTURES).filter(item => ['spawn','extension','storage','terminal'].includes(item.structureType)).map(item => logisticsPool('stock',item.id,'energy')));
  const claims = peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? [];
  return claims.filter(claim => claim.expiresAt > Game.time).flatMap(claim => claim.allocations).filter(allocation => pools.has(allocation.pool)).reduce((sum,allocation) => sum+allocation.amount,0);
}
