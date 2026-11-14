import { observeLinks, issueLinkTransfer } from '../adapters/screeps/links';
import { classifyLinks } from '../features/logistics/links/roles';
import { planLinkTransfers } from '../features/logistics/links/plan';
import { defaultLinkPolicy } from '../features/logistics/links/model';
import type { createActionArbiter } from '../core/execution/action-arbiter';
/** One tick's link intent plan shares action ownership with the native runtime. */
export function runNativeLinks(room: Room, arbiter: ReturnType<typeof createActionArbiter>): void {
  const observed = observeLinks(room);
  const roles = classifyLinks(observed.links, observed.room);
  const transfers = planLinkTransfers(roles, observed.room.storageEnergy, { ...defaultLinkPolicy, lossRatio: LINK_LOSS_RATIO });
  for (const transfer of transfers) issueLinkTransfer(arbiter, 'links:' + room.name, transfer);
}
