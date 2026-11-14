import { createLinkReservations } from '../features/logistics/links/reservations';
import { capacityPool, logisticsEndpoint } from '../adapters/screeps/hauling-observation';
import type { StatePort } from '../persistence/versioned-state';
import { observeLinks, issueLinkTransfer } from '../adapters/screeps/links';
import { classifyLinks } from '../features/logistics/links/roles';
import { planLinkTransfers } from '../features/logistics/links/plan';
import type { RuntimeConfig } from '../config/model';
import type { createActionArbiter } from '../core/execution/action-arbiter';
/** One tick's link intent plan shares action ownership with the native runtime. */
export function runNativeLinks(state: StatePort, room: Room, arbiter: ReturnType<typeof createActionArbiter>, config: Readonly<RuntimeConfig>): void {
  const observed = observeLinks(room);
  const reservations = createLinkReservations(state, Game.time, 'links:' + room.name,
    id => capacityPool(id, logisticsEndpoint(id), RESOURCE_ENERGY));
  const roles = classifyLinks(observed.links.map(reservations.available), observed.room);
  const transfers = planLinkTransfers(roles, observed.room.storageEnergy, { controllerTrigger: config.linkControllerTrigger,
    storageAssistTrigger: config.linkStorageAssistTrigger, relayTrigger: config.linkRelayTrigger, lossRatio: LINK_LOSS_RATIO });
  for (const transfer of transfers) reservations.issue(transfer, observed.links,
    () => issueLinkTransfer(arbiter, 'links:' + room.name, transfer));
}
