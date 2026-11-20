import { retireUnitTasks } from '../persistence/tasks/retire';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { StatePort } from '../persistence/versioned-state';
import { createReservationCleanup } from '../persistence/reservation-cleanup';
import { stateKey } from '../persistence/state-key';
import { createUnitLifecycle } from './unit-lifecycle';
import type { UnitIdentity } from '../persistence/units/schema';
export function createCreepMaintenance(state: StatePort, observe: () => readonly UnitIdentity[], definitions: Readonly<Record<string, TaskDefinition>>, retireIdentity: (id: string) => void = () => {}, beforeRetire: (unit: UnitIdentity) => void = () => {}) {
  return createUnitLifecycle(state, observe, (name, id) => {
    beforeRetire({ name,id });
    if (state.read(stateKey('tasks', name)) !== undefined) retireUnitTasks(state, name, definitions);
    else createReservationCleanup(state).releaseHolder(name);
    retireIdentity(id);
  });
}

