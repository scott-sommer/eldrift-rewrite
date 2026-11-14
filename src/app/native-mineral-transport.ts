import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observeMineralTransport } from '../adapters/screeps/mineral-transport';
import { generateStockRequests } from '../features/logistics/stock-requests';
import { haulingOwner } from '../features/logistics/identity';
/** Port of mineral-container collection, with explicit headroom and a storage fallback. */
export function generateNativeMineralTransport(state: StatePort, room: Room, config: Readonly<RuntimeConfig>): void {
  const observed = observeMineralTransport(room, config.terminalFreeReserve, config.storageFreeReserve);
  generateStockRequests(state, room.name, Game.time, observed.sources, observed.sinks, {
    owner: haulingOwner(room.name) + ':mineral', namespace: 'mineral-transport', priority: 5,
    lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10,
  });
}
