import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observeEnergyBanking } from '../adapters/screeps/energy-banking';
import { generateStockRequests } from '../features/logistics/stock-requests';
import { haulingOwner } from '../features/logistics/identity';
/** Consumer requests are generated first, leaving their source commitments ahead of banking. */
export function generateNativeEnergyBanking(state: StatePort, room: Room, config: Readonly<RuntimeConfig>): void {
  const observed = observeEnergyBanking(room, config.storageFreeReserve, config.terminalFreeReserve);
  generateStockRequests(state, room.name, Game.time, observed.sources, observed.sinks, {
    owner: haulingOwner(room.name) + ':bank', namespace: 'energy-bank', priority: 6,
    lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10,
  });
}
