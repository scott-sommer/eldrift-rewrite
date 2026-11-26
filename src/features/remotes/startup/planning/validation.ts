import { natural, object, room } from '../../assignment-validation';
import { selectionBinding } from '../selection-validation';
import { restoreStartupProject } from '../../../../capabilities/economy/startup/project';
import { decodeStartupPlanningInput, encodeStartupPlanningInput } from './input';
import type { StartupPlanningContext, StartupPlanningJob } from './model';
const restoredProjects = new WeakMap<object,ReturnType<typeof restoreStartupProject>>();
export function validPlanningContext(value: unknown, home: string, tick: number): value is StartupPlanningContext {
  if (!object(value) || !room(value.room) || value.room === home || !selectionBinding(value.binding)) return false;
  if (typeof value.source !== 'string' || value.source.length === 0 || value.source.length > 240) return false;
  if (!natural(value.generation) || value.generation === 0) return false;
  return validWindow(value,tick);
}
function validWindow(value: Record<string,unknown>, tick: number): boolean {
  if (!natural(value.observedAt) || !natural(value.expiresAt)) return false;
  return value.observedAt <= tick && value.expiresAt >= value.observedAt && value.expiresAt-value.observedAt <= 10000;
}
export function validPlanningJob(value: unknown, home: string, clock: number): value is StartupPlanningJob {
  if (!validPlanningContext(value,home,clock) || Object.keys(value).length !== 8) return false;
  try {
    const job = value as StartupPlanningJob, input = decodeStartupPlanningInput(job.input);
    if (input.project.spawning.room !== home) return false;
    if (JSON.stringify(encodeStartupPlanningInput(input)) !== JSON.stringify(job.input)) return false;
    const project = restoreStartupProject(input,job.checkpoint);
    restoredProjects.set(job,project); return true;
  } catch { return false; }
}
export function planningContextKey(value: StartupPlanningContext): string {
  return JSON.stringify([value.room,value.source,value.generation,value.binding,value.observedAt,value.expiresAt]);
}

/** Consume the exact instance restored while validating this detached job. Never reuse an advanced model for an older snapshot. */
export function takeValidatedPlanningProject(job: StartupPlanningJob) {
  const project = restoredProjects.get(job); restoredProjects.delete(job); return project;
}
