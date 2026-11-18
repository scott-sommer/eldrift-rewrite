import type { StatePort } from '../persistence/versioned-state';
import { openState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { createQuantityReservations } from '../persistence/quantities/store';
import { reserveTransfer } from '../features/logistics/reserve-transfer';
import type { TransferAvailability } from '../features/logistics/reserve-transfer';
import { assignHaulingTask } from './assign-hauling-task';
import { taskScope } from './task-runner';
export interface NewHaulingTask {
  home: string; name: string; unitId: string; tick: number; request: LogisticsRequest;
  phase: 'collect' | 'deliver'; maximum: number; sinkRoom?: string; available: TransferAvailability;
}
/** Book before publishing new work, with rollback through the shared owners if task admission fails. */
export function submitHaulingTask(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>, input: NewHaulingTask): boolean {
  if (openState(state,stateKey('tasks',input.name),taskSchema(input.name,definitions)).queue.length) return false;
  const journal = createTransferJournal(state,input.unitId).read();
  if (!journal.acknowledged || journal.result?.status === 'unknown') return false;
  const queue = createLogisticsRequests(state,input.home);
  if (!queue.availableSlots(input.tick)) return false;
  const { request } = input, scope = taskScope(input.name,request.id);
  const amount = reserveTransfer(state,request,{ holder: input.name,scope,phase: input.phase,maximum: input.maximum,expiresAt: input.tick + 2 },input.available,input.tick);
  if (!amount) return false;
  const admitted = { ...request,quantity: amount };
  function rollback(): void { queue.cancel(request.owner,request.id); createQuantityReservations(state).releaseScope(scope); }
  try {
    queue.submit(admitted,input.tick);
    const assigned = assignHaulingTask(state,definitions,input.name,request.id,
      { home: input.home,unitId: input.unitId,request: admitted,...(input.sinkRoom ? { sinkRoom: input.sinkRoom } : {}) },input.tick,admitted.expiresAt);
    if (!assigned) rollback();
    return assigned;
  } catch (error) { rollback(); throw error; }
}
