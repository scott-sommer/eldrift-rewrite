import type { TaskRecord } from '../../persistence/tasks/schema';
import { validHaulingPayload } from '../hauling-task';
import type { HaulingTaskPayload } from '../hauling-task';
import { logisticsPool } from '../../capabilities/logistics/request';
/** Shared native/forecast identity; ordinary hauling must not be taken over as remote cargo recovery. */
export function remoteBankingTask(task: Readonly<TaskRecord>,home: string): task is Readonly<TaskRecord> & { payload: HaulingTaskPayload } {
  if (task.kind !== 'haul' || !validHaulingPayload(task.payload)) return false;
  const payload = task.payload;
  return payload.home === home && payload.sinkRoom === home && payload.request.owner === logisticsPool('cargo-recovery',home);
}
