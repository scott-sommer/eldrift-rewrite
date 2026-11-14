import type { WorkOrder } from '../../capabilities/work/assessment';
import { workStep } from '../../capabilities/work/step';
import { createCreepActions } from './creep-actions';
import type { createActionArbiter } from '../../core/execution/action-arbiter';
import type { createMovementService } from './movement-service';
export function createNativeWork(arbiter: ReturnType<typeof createActionArbiter>, movement: Pick<ReturnType<typeof createMovementService>, 'move'>) {
  return (creep: Creep, order: WorkOrder, owner: string) => {
    const target = Game.getObjectById(order.id as Id<ConstructionSite | Structure>);
    const actions = createCreepActions(creep, owner, arbiter);
    const act = () => order.kind === 'build' ? actions.build(target as ConstructionSite) : order.kind === 'repair'
      ? actions.repair(target as Structure) : actions.upgrade(target as StructureController);
    const complete = order.kind === 'repair' && !!target && 'hits' in target && target.hits >= order.targetHits!;
    return workStep({ tick: Game.time, complete, target: target ? 'visible' : Game.rooms[order.position.room] ? 'missing' : 'unseen',
      inRange: !!target && creep.pos.inRangeTo(target, 3), energy: creep.store.energy }, {
      act, approach: () => movement.move(creep, { owner, destination: order.position, range: 3,
        policy: { version: 'owned-work', blockedRooms: [], costs: {}, maximumRooms: 4 } }),
      rejected: code => ({ status: 'blocked', reason: 'work-intent:' + code, retryAt: Game.time + 1 }),
    });
  };
}
