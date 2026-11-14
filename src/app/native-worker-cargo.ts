import type { StatePort } from '../persistence/versioned-state';
import { validHaulingPayload } from './hauling-task';
import { logisticsPool } from '../capabilities/logistics/request';
import type { TaskRecord } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { taskSchema } from '../persistence/tasks/schema';
import { openState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeHaulingTask } from './native-hauling-task';
import { createTaskRunner } from './task-runner';
import { settleHaulingTask } from './settle-hauling-task';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { createCreepActions } from '../adapters/screeps/creep-actions';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { recoverNativeCargo, nativeCargoSinks } from './native-cargo-recovery';
import { reconcileWorkTask } from './reconcile-work-task';
import type { RuntimeConfig } from '../config/model';
const foreign = (resource: ResourceConstant) => resource !== 'energy';
/** Cargo disposal temporarily owns the worker, then ordinary work is selected afresh. */
export function createNativeWorkerCargo(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  otherDefinitions: Readonly<Record<string, TaskDefinition>>) {
  const definitions = { haul: createNativeHaulingTask(state, dispatch,
    { version: 'worker-cargo', blockedRooms: [], costs: {}, maximumRooms: 4 }) };
  const schemas = { ...otherDefinitions, ...definitions };
  const execute = createTaskRunner(state, definitions, () => Game.time, schemas);
  return { definitions, run(creep: Creep, home: string, config: Readonly<RuntimeConfig>): boolean {
    settleHaulingTask(state, schemas, creep, observeTransfer);
    if (!config.workersEnabled) return false;
    const resource = (Object.keys(creep.store) as ResourceConstant[]).find(type => foreign(type) && creep.store.getUsedCapacity(type) > 0);
    if (resource) reconcileWorkTask(state, schemas, { name: creep.name, id: creep.id, home }, Game.time, () => undefined);
    const tasks = openState(state, stateKey('tasks', creep.name), taskSchema(creep.name, schemas));
    if (!resource && tasks.queue[0]?.kind !== 'haul') return false;
    dispatch.activate();
    recoverNativeCargo(state, schemas, creep, home, config.terminalFreeReserve, foreign);
    const current = openState(state, stateKey('tasks', creep.name), taskSchema(creep.name, schemas)).queue[0];
    if (current && ownsCargoTask(current, creep, home)) execute(creep.name, creep);
    else if (!current && resource) dropWithoutDestination(creep, home, resource, config, state, dispatch);
    return true;
  } };
}
function ownsCargoTask(task: TaskRecord, creep: Creep, home: string): boolean {
  if (task.kind !== 'haul' || !validHaulingPayload(task.payload)) return false;
  const payload = task.payload;
  return payload.unitId === creep.id && payload.home === home && payload.request.source === creep.id
    && foreign(payload.request.resource as ResourceConstant) && payload.request.owner === logisticsPool('cargo-recovery', home);
}
function dropWithoutDestination(creep: Creep, home: string, resource: ResourceConstant, config: Readonly<RuntimeConfig>,
  state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>): void {
  const room = Game.rooms[home];
  if (!room || !config.workerCargoDropFallback || nativeCargoSinks(room, resource, config.terminalFreeReserve).length) return;
  const journal = createTransferJournal(state, creep.id).read();
  if (!journal.acknowledged || journal.result?.status === 'unknown') return;
  createCreepActions(creep, 'worker-cargo:' + creep.id, dispatch.arbiter).drop(resource);
}
