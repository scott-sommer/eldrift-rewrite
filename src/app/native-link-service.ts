import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observeLinks } from '../adapters/screeps/links';
import { classifyLinks } from '../features/logistics/links/roles';
import { planLinkService } from '../features/logistics/links/service';
import { reconcileLinkService } from '../features/logistics/links/service-requests';
/** Native observation and configuration are kept outside service policy and request lifecycle. */
export function generateNativeLinkService(state: StatePort, room: Room, config: Readonly<RuntimeConfig>): void {
  if (!config.linksEnabled || !config.linkServiceEnabled) {
    reconcileLinkService(state, room.name, Game.time, undefined);
    return;
  }
  const observed = observeLinks(room);
  const roles = classifyLinks(observed.links, observed.room);
  const storage = room.storage ? { id: room.storage.id, energy: room.storage.store.energy,
    free: room.storage.store.getFreeCapacity(RESOURCE_ENERGY) } : undefined;
  const desired = planLinkService(roles, storage, { controllerNeed: config.linkStorageAssistTrigger,
    storageTarget: config.linkStorageTarget, maximumBatch: 200 });
  reconcileLinkService(state, room.name, Game.time, desired);
}
