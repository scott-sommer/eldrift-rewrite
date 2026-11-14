import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { stateKey } from '../persistence/state-key';
import { observeRecoveryBanking } from '../adapters/screeps/recovery-banking';
import { generateStockRequests } from '../features/logistics/stock-requests';
import { haulingOwner } from '../features/logistics/identity';
/** Consumer commitments precede salvage; inactive reconciliation retires unreserved work. */
export function generateNativeRecoveryBanking(state: StatePort, room: Room, config: Readonly<RuntimeConfig>, active: boolean): void {
  if (!active && state.read(stateKey('logistics-requests', room.name)) === undefined) return;
  const observed = active ? observeRecoveryBanking(room, { storageReserve: config.storageFreeReserve,
    terminalReserve: config.terminalFreeReserve, protectLinks: config.linksEnabled,
    protectController: config.workersEnabled || config.workerSupplyEnabled }) : { sources: [], sinks: [] };
  generateStockRequests(state, room.name, Game.time, observed.sources, observed.sinks, {
    owner: haulingOwner(room.name) + ':recovery-bank', namespace: 'recovery-bank', priority: 5,
    lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10,
  });
}
