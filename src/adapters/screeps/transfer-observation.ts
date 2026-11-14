import type { TransferAttempt, TransferObservation } from '../../capabilities/logistics/confirmation';
/** Room event logs describe the preceding engine tick; confirmation checks that exact tick window. */
export function observeTransfer(attempt: TransferAttempt): TransferObservation {
  const room = Game.rooms[attempt.room];
  const creep = Game.getObjectById(attempt.unit as Id<Creep>);
  const cargo = creep?.store.getUsedCapacity(attempt.resource as ResourceConstant);
  const events = room?.getEventLog().flatMap(event => event.event === EVENT_TRANSFER ? [{
    source: event.objectId, target: event.data.targetId, resource: event.data.resourceType, amount: event.data.amount,
  }] : []);
  return { tick: Game.time, ...(cargo === undefined ? {} : { cargo }), ...(events ? { events } : {}) };
}
