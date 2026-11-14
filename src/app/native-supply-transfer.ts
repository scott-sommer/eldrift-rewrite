import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import type { Outcome } from '../core/execution/model';
import { createNativeTransfer } from '../adapters/screeps/transfer';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { reserveTransfer } from '../features/logistics/reserve-transfer';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
const policy = { version: 'upgrade-supply-cycle', blockedRooms: [], costs: {}, maximumRooms: 16 };
export function executeSupplyTransfer(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, creep: Creep,
  target: StructureStorage | StructureTerminal | StructureContainer | Creep, kind: 'withdraw' | 'transfer', maximum: number, available: number,
  resource: ResourceConstant = 'energy'): Outcome {
  const owner = creep.memory.population!.owner;
  const id = logisticsPool('supply-intent', creep.id, String(Game.time));
  const source = kind === 'withdraw' ? target.id : creep.id;
  const sink = kind === 'withdraw' ? creep.id : target.id;
  const free = kind === 'withdraw' ? creep.store.getFreeCapacity(resource) : target.store.getFreeCapacity(resource) ?? 0;
  const transfer = createNativeTransfer(dispatch.arbiter, dispatch.movement, attempt => {
    const amount = reserveTransfer(state, { id, owner, source, sink, resource, quantity: maximum, priority: 88, expiresAt: Game.time + 1 },
      { holder: creep.name, scope: id, phase: kind === 'withdraw' ? 'collect' : 'deliver', maximum: attempt.amount, expiresAt: Game.time + 1 },
      { sourceStock: available, sinkFree: free, sinkPool: logisticsPool('capacity', sink) }, Game.time);
    if (amount === attempt.amount && createTransferJournal(state, creep.id).begin(attempt)) return true;
    createQuantityReservations(state).releaseScope(id);
    return false;
  });
  return transfer(creep, { owner, target: target.id, position: movementPosition(target.pos), resource,
    kind, maximum, attemptId: id, policy });
}
