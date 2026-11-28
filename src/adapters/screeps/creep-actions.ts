import { economySlots } from '../../capabilities/actions/economy-slots';
import type { EconomyAction } from '../../capabilities/actions/economy-slots';
import type { createActionArbiter } from '../../core/execution/action-arbiter';
type Arbiter = ReturnType<typeof createActionArbiter>;
export type { EconomyAction } from '../../capabilities/actions/economy-slots';
export { economySlots } from '../../capabilities/actions/economy-slots';
export function createCreepActions(creep: Creep, owner: string, arbiter: Arbiter) {
  function issue(action: EconomyAction, invoke: () => number) {
    return arbiter.issue(creep.name, owner, economySlots(action), invoke, code => code === 0);
  }
  return {
    move: (direction: DirectionConstant) => issue('move', () => creep.move(direction)),
    harvest: (target: Source | Mineral | Deposit) => issue('harvest', () => creep.harvest(target)),
    dismantle: (target: Structure) => issue('dismantle', () => creep.dismantle(target)),
    build: (target: ConstructionSite) => issue('build', () => creep.build(target)),
    repair: (target: Structure) => issue('repair', () => creep.repair(target)),
    upgrade: (target: StructureController) => issue('upgradeController', () => creep.upgradeController(target)),
    transfer: (target: AnyCreep | Structure, resource: ResourceConstant, amount?: number) => issue('transfer', () => creep.transfer(target, resource, amount)),
    withdraw: (target: Structure | Tombstone | Ruin, resource: ResourceConstant, amount?: number) => issue('withdraw', () => creep.withdraw(target, resource, amount)),
    pickup: (target: Resource) => issue('pickup', () => creep.pickup(target)),
    drop: (resource: ResourceConstant, amount?: number) => issue('drop', () => creep.drop(resource, amount)),
  };
}
