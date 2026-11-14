import type { StatePort } from '../persistence/versioned-state';
import { openState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { createQuantityReservations } from '../persistence/quantities/store';
import { reserveTransfer } from '../features/logistics/reserve-transfer';
import { logisticsPool } from '../capabilities/logistics/request';
import { assignHaulingTask } from './assign-hauling-task';
import { taskScope } from './task-runner';
export interface CargoRecovery {
  home: string; name: string; unitId: string; tick: number;
  resource: string; quantity: number; sink: string; sinkFree: number; sinkPool: string;
}
/** Recovery gets its own receipt identity; it never credits abandoned work. */
export function assignCargoRecovery(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>, cargo: CargoRecovery): boolean {
  if (openState(state, stateKey('tasks', cargo.name), taskSchema(cargo.name, definitions)).queue.length) return false;
  const journal = createTransferJournal(state, cargo.unitId).read();
  if (!journal.acknowledged || journal.result?.status === 'unknown') return false;
  const queue = createLogisticsRequests(state, cargo.home);
  if (queue.availableSlots(cargo.tick) === 0) return false;
  const id = logisticsPool('cargo-recovery', cargo.unitId, cargo.resource, cargo.sink, String(cargo.tick));
  const scope = taskScope(cargo.name, id);
  const request = { id, owner: logisticsPool('cargo-recovery', cargo.home), source: cargo.unitId, sink: cargo.sink,
    resource: cargo.resource, quantity: cargo.quantity, priority: -1, expiresAt: cargo.tick + 100 };
  const amount = reserveTransfer(state, request, { holder: cargo.name, scope, phase: 'deliver', maximum: cargo.quantity, expiresAt: cargo.tick + 2 },
    { sourceStock: 0, sinkFree: cargo.sinkFree, sinkPool: cargo.sinkPool }, cargo.tick);
  if (amount === 0) return false;
  request.quantity = amount;
  try {
    queue.submit(request, cargo.tick);
    const assigned = assignHaulingTask(state, definitions, cargo.name, id,
      { home: cargo.home, unitId: cargo.unitId, request }, cargo.tick, request.expiresAt);
    if (!assigned) { queue.cancel(request.owner, id); createQuantityReservations(state).releaseScope(scope); }
    return assigned;
  } catch (error) {
    queue.cancel(request.owner, id);
    createQuantityReservations(state).releaseScope(scope);
    throw error;
  }
}
