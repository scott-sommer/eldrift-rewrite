import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { planStoreBalance } from '../features/logistics/store-balance';
import { reconcileServiceRequest } from '../features/logistics/service-request';
/** Reconcile one balancing request, letting existing admitted cargo settle before a policy reversal. */
export function generateNativeStoreBalance(state: StatePort, room: Room, config: Readonly<RuntimeConfig>): void {
  const desired = balanceAllowed(room, config) ? planStoreBalance(snapshot(room.storage, config.storageFreeReserve),
    snapshot(room.terminal, config.terminalFreeReserve), { terminalLow: config.terminalEnergyLow,
      terminalHigh: config.terminalEnergyHigh, storageEnergyReserve: config.storageEnergyReserve, maximumBatch: 200 }) : undefined;
  reconcileServiceRequest(state, room.name, Game.time, 'store-balance:' + room.name, 7, desired);
}
function snapshot(item: StructureStorage | StructureTerminal | undefined, reserve: number) {
  return item?.my ? { id: item.id, free: Math.max(0, item.store.getFreeCapacity() - reserve),
    stock: Object.fromEntries(Object.keys(item.store).map(resource => [resource, item.store.getUsedCapacity(resource as ResourceConstant)])) } : undefined;
}

function balanceAllowed(room: Room, config: Readonly<RuntimeConfig>): boolean {
  return config.storeBalancingEnabled && !config.upgradeRoomServiceEnabled && room.energyCapacityAvailable > 0
    && room.energyAvailable > room.energyCapacityAvailable * config.storeBalanceMinimumEnergyFraction;
}
