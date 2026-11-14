import type { CollectionOrder } from '../../capabilities/resources/collection';
import type { IntentResult } from '../../core/execution/action-arbiter';
import type { createActionArbiter } from '../../core/execution/action-arbiter';
import type { createMovementService } from './movement-service';
import { createCreepActions } from './creep-actions';
import { transferStep } from '../../capabilities/resources/step';
export function createNativeCollection(arbiter: ReturnType<typeof createActionArbiter>, movement: Pick<ReturnType<typeof createMovementService>, 'move'>) {
  return (creep: Creep, order: CollectionOrder, owner: string,
    reserve: (invoke: (amount: number) => IntentResult) => IntentResult | undefined) => {
    const target = Game.getObjectById(order.source.id as Id<Resource | Structure | Tombstone | Ruin>);
    const actions = createCreepActions(creep, owner, arbiter);
    return transferStep({ tick: Game.time, complete: creep.store.getFreeCapacity() === 0,
      target: target ? 'visible' : Game.rooms[order.source.position.room] ? 'missing' : 'unseen',
      inRange: !!target && creep.pos.inRangeTo(target, 1), available: order.amount, capacity: creep.store.getFreeCapacity(), remaining: order.amount }, {
      approach: () => movement.move(creep, { owner, destination: order.source.position, range: 1,
        policy: { version: 'owned-work-collection', blockedRooms: [], costs: {}, maximumRooms: 4 } }),
      transfer: () => reserve(amount => order.source.kind === 'drop' ? actions.pickup(target as Resource)
        : actions.withdraw(target as Structure | Tombstone | Ruin, RESOURCE_ENERGY, amount)) ?? { status: 'blocked', reason: 'action-conflict' },
      rejected: code => ({ status: 'blocked', reason: 'collection-intent:' + code, retryAt: Game.time + 1 }),
    });
  };
}
