import type { StatePort } from '../../persistence/versioned-state';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import type { ReservationDemand } from './reservation-task';
import { assignRemoteTask } from './assign-task';
export function assignReservationTask(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>, unit: string,
  demand: ReservationDemand, tick: number, lifetime: number): string | undefined {
  return assignRemoteTask(state,definitions,'reserve',unit,demand,tick,lifetime);
}
