import { retireUnitTasks } from '../persistence/tasks/retire';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { StatePort } from '../persistence/versioned-state';
import { createReservations } from '../persistence/reservations/store';
import { stateKey } from '../persistence/state-key';
import { createUnitLifecycle } from './unit-lifecycle';
import type { UnitIdentity } from '../persistence/units/schema';
export function createCreepMaintenance(state: StatePort, observe: () => readonly UnitIdentity[], definitions: Readonly<Record<string, TaskDefinition>>) {
  return createUnitLifecycle(state, observe, name => {
    if (state.read(stateKey('tasks', name)) !== undefined) retireUnitTasks(state, name, definitions);
    else if (state.read('reservations/empire') !== undefined) createReservations(state).releaseHolder(name);
  });
}
