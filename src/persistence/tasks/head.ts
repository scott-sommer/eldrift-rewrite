import { peekState } from '../versioned-state';
import type { StatePort, StateSchema } from '../versioned-state';
import { stateKey } from '../state-key';
import { validTaskHeader } from './schema';
import type { TaskRecord, UnitTasks } from './schema';
import { migrateTasksV1 } from './migrations';
/** Read owner metadata without interpreting or granting authority to another feature's payload. */
export function peekTaskHead(state: StatePort, unit: string, maximum = 20): Omit<TaskRecord,'payload'> | undefined {
  if (!unit || !Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid task metadata scope');
  const schema: StateSchema<UnitTasks> = { owner: 'tasks',version: 2,migrations: { 1: migrateTasksV1 },initial: () => ({ unit,queue: [] }),
    valid: (value): value is UnitTasks => validHeaders(value,unit,maximum) };
  const head = peekState(state,stateKey('tasks',unit),schema)?.queue[0];
  return head ? { id: head.id,kind: head.kind,phase: head.phase,wakeAt: head.wakeAt,retries: head.retries,expiresAt: head.expiresAt } : undefined;
}
function validHeaders(value: unknown, unit: string, maximum: number): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<UnitTasks>;
  if (record.unit !== unit || !Array.isArray(record.queue) || record.queue.length > maximum) return false;
  return record.queue.every(validTaskHeader) && new Set(record.queue.map(task => task.id)).size === record.queue.length;
}
