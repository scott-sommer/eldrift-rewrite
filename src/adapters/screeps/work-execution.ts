import { movementArrived } from '../../capabilities/movement/step';
import { movementPosition } from './movement-traffic';
import type { WorkOrder } from '../../capabilities/work/assessment';
import { workStep } from '../../capabilities/work/step';
import { createCreepActions } from './creep-actions';
import type { createActionArbiter } from '../../core/execution/action-arbiter';
import type { createMovementService } from './movement-service';
export function createNativeWork(arbiter: ReturnType<typeof createActionArbiter>, movement: Pick<ReturnType<typeof createMovementService>, 'move'>) {
  return (creep: Creep, order: WorkOrder, owner: string, upgradeRange = 3) => {
    validateUpgradeRange(upgradeRange);
    const target = Game.getObjectById(order.id as Id<ConstructionSite | Structure>);
    const actions = createCreepActions(creep, owner, arbiter);
    const preferredRange = order.kind === 'upgrade' ? upgradeRange : 3;
    const arrived = (range: number) => movementArrived({ position: movementPosition(creep.pos), destination: order.position, range });
    const approach = () => movement.move(creep, { owner, destination: order.position, range: preferredRange,
      policy: { version: 'owned-work', blockedRooms: [], costs: {}, maximumRooms: 4 } });
    const act = () => {
      const intent = issueWork(actions, order, target);
      if (intent.status === 'issued' && order.kind === 'upgrade' && !arrived(preferredRange)) approach();
      return intent;
    };
    const complete = order.kind === 'repair' && !!target && 'hits' in target && target.hits >= order.targetHits!;
    return workStep({ tick: Game.time, complete, target: target ? 'visible' : Game.rooms[order.position.room] ? 'missing' : 'unseen',
      inRange: !!target && arrived(3), energy: creep.store.energy }, {
      act, approach,
      rejected: code => ({ status: 'blocked', reason: 'work-intent:' + code, retryAt: Game.time + 1 }),
    });
  };
}

function issueWork(actions: ReturnType<typeof createCreepActions>, order: WorkOrder, target: ConstructionSite | Structure | null) {
  if (order.kind === 'build') return actions.build(target as ConstructionSite);
  if (order.kind === 'repair') return actions.repair(target as Structure);
  return actions.upgrade(target as StructureController);
}

function validateUpgradeRange(range: number): void {
  if (!Number.isInteger(range) || range < 1 || range > 3) throw new Error('Invalid upgrade approach range');
}
