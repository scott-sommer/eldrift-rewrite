import type { createActionArbiter } from '../../core/execution/action-arbiter';
import type { IntentResult } from '../../core/execution/action-arbiter';
import type { Outcome } from '../../core/execution/model';
import type { TransferAttempt } from '../../capabilities/logistics/confirmation';
import { transferStep } from '../../capabilities/resources/step';
import { createCreepActions } from './creep-actions';
import type { createMovementService } from './movement-service';
import { transferAmounts, pickupExceedsReservation, nativeTransferView } from './transfer-target';
import type { NativeTransferCommand, TransferObject } from './transfer-target';
export function createNativeTransfer(arbiter: ReturnType<typeof createActionArbiter>,
  movement: Pick<ReturnType<typeof createMovementService>, 'move'>, begin: (attempt: TransferAttempt) => boolean) {
  return (creep: Creep, command: NativeTransferCommand): Outcome => {
    if (!Number.isSafeInteger(command.maximum) || command.maximum < 1) throw new Error('Invalid transfer reservation amount');
    const target = Game.getObjectById(command.target as Id<TransferObject>);
    const amounts = target ? transferAmounts(creep, target, command) : undefined;
    if (target && !amounts) return { status: 'failed', reason: 'incompatible-transfer-target' };
    if (pickupExceedsReservation(command, amounts)) {
      return { status: 'blocked', reason: 'pickup-exceeds-reservation', retryAt: Game.time + 1 };
    }
    return transferStep(nativeTransferView(creep, target, command, amounts), {
      approach: () => movement.move(creep, { owner: command.owner, destination: command.position, range: 1, policy: command.policy }),
      transfer: amount => issue(creep, target!, command, amount, arbiter, begin),
      rejected: code => ({ status: 'blocked', reason: 'transfer-intent:' + code, retryAt: Game.time + 1 }),
    });
  };
}
function issue(creep: Creep, target: TransferObject, command: NativeTransferCommand, amount: number,
  arbiter: ReturnType<typeof createActionArbiter>, begin: (attempt: TransferAttempt) => boolean): IntentResult {
  const attempt: TransferAttempt = { id: command.attemptId, ...(command.requestKey ? { requestKey: command.requestKey } : {}), unit: creep.id, target: command.target, room: creep.room.name,
    resource: command.resource, kind: command.kind, tick: Game.time, amount, cargoBefore: creep.store.getUsedCapacity(command.resource) };
  if (!begin(attempt)) return { status: 'blocked', reason: 'action-conflict' };
  const actions = createCreepActions(creep, command.owner, arbiter);
  if (command.kind === 'pickup') return actions.pickup(target as Resource);
  if (command.kind === 'withdraw') return actions.withdraw(target as AnyStoreStructure | Tombstone | Ruin, command.resource, amount);
  return actions.transfer(target as AnyStoreStructure | Creep | PowerCreep, command.resource, amount);
}


