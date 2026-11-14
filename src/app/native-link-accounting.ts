import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { createLinkJournal } from '../features/logistics/links/journal';
/** The engine link EVENT_TRANSFER amount is gross sent; net receipt is derived using its pinned loss rule. */
export function settleNativeLinkTransfers(state: StatePort, room: Room): void {
  if (state.read(stateKey('link-transfers', room.name)) === undefined) return;
  const events = room.getEventLog().filter(event => event.event === EVENT_TRANSFER).map(event => ({
    source: event.objectId, sink: event.data.targetId, resource: event.data.resourceType, amount: event.data.amount,
  }));
  createLinkJournal(state, room.name).settle(Game.time, events);
}
