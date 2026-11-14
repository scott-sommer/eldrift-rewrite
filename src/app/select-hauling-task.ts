import type { StatePort } from '../persistence/versioned-state';
import { openState } from '../persistence/versioned-state';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { stateKey } from '../persistence/state-key';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { reserveTransfer } from '../features/logistics/reserve-transfer';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import { assignHaulingTask } from './assign-hauling-task';
import { taskScope } from './task-runner';
import type { HaulingView } from './hauling-cycle';
export interface HaulingAdmission {
  home: string;
  name: string;
  unitId: string;
  tick: number;
  cargoTotal: number;
}
/** Admit only idle, empty couriers. Existing cargo requires a separate recovery policy. */
export function selectHaulingTask(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>,
  unit: HaulingAdmission, observe: (request: LogisticsRequest) => HaulingView): boolean {
  if (!Number.isSafeInteger(unit.cargoTotal) || unit.cargoTotal < 0) throw new Error('Invalid courier cargo');
  if (unit.cargoTotal > 0) return false;
  if (openState(state, stateKey('tasks', unit.name), taskSchema(unit.name, definitions)).queue.length) return false;
  for (const request of createLogisticsRequests(state, unit.home).pending(unit.tick)) {
    const view = observe(request);
    if (view.tick !== unit.tick || view.cargo !== 0) throw new Error('Inconsistent hauling admission observation');
    if (admit(state, definitions, unit, request, view)) return true;
  }
  return false;
}
function admit(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>, unit: HaulingAdmission,
  request: LogisticsRequest, view: HaulingView): boolean {
  const id = logisticsPool('task', unit.unitId, request.owner, request.id, String(unit.tick));
  const scope = taskScope(unit.name, id);
  const amount = reserveTransfer(state, request, { holder: unit.name, scope, phase: 'collect',
    maximum: view.freeCargo, expiresAt: unit.tick + 2 }, view, unit.tick);
  if (amount === 0) return false;
  try {
    const assigned = assignHaulingTask(state, definitions, unit.name, id,
      { home: unit.home, unitId: unit.unitId, request }, unit.tick, request.expiresAt);
    if (!assigned) createQuantityReservations(state).releaseScope(scope);
    return assigned;
  } catch (error) {
    createQuantityReservations(state).releaseScope(scope);
    throw error;
  }
}
