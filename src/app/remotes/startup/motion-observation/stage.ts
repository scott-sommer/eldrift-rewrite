import type { PaidCourierObservation } from './model';
/** Physical cargo and the current task/journal determine stage; callers retain authority and lifecycle checks. */
export function paidCourierStage(spawning: boolean, cargo: number, task: PaidCourierObservation['task'], pending: boolean): PaidCourierObservation['stage'] | undefined {
  if (spawning) return task || pending ? undefined : 'spawning';
  if (pending) return 'pending';
  if (!task) return cargo === 0 ? 'idle' : undefined;
  if (task.remaining === 0) return cargo === 0 ? 'completion' : undefined;
  return cargo === 0 ? 'collect' : 'deliver';
}
