import { sameSpawnRequest } from '../capabilities/spawning/placement';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { createLaborTaskStaging } from '../features/work/stage-labor-task';
import type { LaborPublication } from '../features/work/labor-publication';
import type { LaborTaskPayload } from '../features/work/labor-task';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { StatePort } from '../persistence/versioned-state';
/** Refuse changed ownership; never cancel an active task or a replacement queue entry. */
export function withdrawLaborPublication(state: StatePort, entry: LaborPublication, definitions: Readonly<Record<string,TaskDefinition>>): boolean {
  const request = entry.request;
  if (request.admission?.kind !== 'household-labor') return false;
  const taskId = request.admission.task, queue = createSpawnQueue(state,request.room), pending = queue.list().find(item => item.id === request.id);
  if (pending && !sameSpawnRequest(pending,request)) return false;
  const staging = createLaborTaskStaging(state,definitions), task = staging.read(request.name)?.queue.find(task => task.id === taskId);
  if (task && !ownsPreparedTask(task,entry)) return false;
  if (pending) queue.cancel(request.id,request.owner);
  if (task) staging.cancel(request.name,request.id);
  return true;
}
function ownsPreparedTask(task: { phase: string; payload: unknown }, entry: LaborPublication): boolean {
  const payload = task.payload as LaborTaskPayload;
  return task.phase === 'await-birth' && !payload.progress && JSON.stringify(payload.proposal) === JSON.stringify(entry.proposal);
}
