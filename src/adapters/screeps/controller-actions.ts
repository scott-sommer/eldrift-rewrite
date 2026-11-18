import type { StatePort } from '../../persistence/versioned-state';
import { createIntentAdmission } from '../../persistence/intent-admission';
import type { createActionArbiter } from '../../core/execution/action-arbiter';
/** Controller effects share durable structure admission and per-creep action ownership. */
export function createNativeControllerActions(state: StatePort, arbiter: ReturnType<typeof createActionArbiter>) {
  const admission = createIntentAdmission(state, () => Game.time);
  const key = (controller: StructureController) => 'structure:' + controller.id;
  return {
    unclaim(controller: StructureController, owner: string): number {
      if (!controller.my) return ERR_NOT_OWNER;
      if (!admission.admit(owner, [key(controller)])) return ERR_BUSY;
      return controller.unclaim();
    },
    reserve(creep: Creep, controller: StructureController, owner: string): number {
      if (!creep.my) return ERR_NOT_OWNER;
      if (controller.owner || controller.reservation && controller.reservation.username !== creep.owner.username) return ERR_INVALID_TARGET;
      if (!admission.admit(owner,[key(controller),'controller-unit:' + creep.id])) return ERR_BUSY;
      const result = arbiter.issue(creep.name,owner,['reserveController'],() => creep.reserveController(controller),code => code === OK);
      return result.status === 'blocked' ? ERR_BUSY : result.code;
    },
    claim(creep: Creep, controller: StructureController, owner: string): number {
      if (!creep.my) return ERR_NOT_OWNER;
      if (controller.owner) return ERR_INVALID_TARGET;
      if (admission.used(key(controller))) return ERR_BUSY;
      const available = Math.max(0, Game.gcl.level - Object.values(Game.rooms).filter(room => room.controller?.my).length);
      if (!available) return ERR_GCL_NOT_ENOUGH;
      if (!admission.admit(owner, [key(controller), 'controller-unit:' + creep.id], { pool: 'gcl', amount: 1, available })) return ERR_BUSY;
      const result = arbiter.issue(creep.name, owner, ['claimController'], () => creep.claimController(controller), code => code === OK);
      return result.status === 'blocked' ? ERR_BUSY : result.code;
    },
  };
}
