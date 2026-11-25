import { validExecution } from '../../core/execution/validation';
import { migrateTasksV1 } from './migrations';
import type { StateSchema } from '../versioned-state';
export interface TaskRecord {
  id: string;
  kind: string;
  phase: string;
  payload: unknown;
  wakeAt: number;
  retries: number;
  expiresAt: number;
}
export interface UnitTasks { unit: string; queue: TaskRecord[] }
export interface TaskDefinition {
  phases: readonly string[];
  validPayload(value: unknown): boolean;
}
function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
export function validTaskHeader(value: unknown): value is TaskRecord {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<TaskRecord>;
  return nonempty(task.id) && nonempty(task.kind) && validExecution(task);
}
function validTask(value: unknown, definitions: Readonly<Record<string, TaskDefinition>>): value is TaskRecord {
  if (!validTaskHeader(value) || !Object.hasOwn(definitions,value.kind)) return false;
  const definition = definitions[value.kind]!;
  return definition.phases.includes(value.phase) && definition.validPayload(value.payload);
}
export function taskSchema(unit: string, definitions: Readonly<Record<string, TaskDefinition>>, maximum = 20): StateSchema<UnitTasks> {
  if (!unit || !Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid task schema limits');
  return {
    owner: 'tasks', version: 2, migrations: { 1: migrateTasksV1 }, initial: () => ({ unit, queue: [] }),
    valid(value: unknown): value is UnitTasks {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<UnitTasks>;
      if (state.unit !== unit || !Array.isArray(state.queue) || state.queue.length > maximum) return false;
      return state.queue.every(task => validTask(task, definitions)) && new Set(state.queue.map(task => task.id)).size === state.queue.length;
    },
  };
}



