import { peekState, saveState } from '../persistence/versioned-state';
import type { StatePort, StateSchema } from '../persistence/versioned-state';
import type { TaskRecord, UnitTasks } from '../persistence/tasks/schema';
/** Flush the owning head before an effect; another head cannot be silently overwritten. */
export function checkpointTask(port: StatePort, key: string, schema: StateSchema<UnitTasks>, owner: Pick<TaskRecord,'id' | 'kind'>, update: Pick<TaskRecord,'phase' | 'payload'>): UnitTasks {
  const current = peekState(port,key,schema), head = current?.queue[0];
  if (!current || head?.id !== owner.id || head.kind !== owner.kind) throw new Error('Task checkpoint owner changed');
  current.queue[0] = { ...head,...update };
  saveState(port,key,schema,current); return current;
}
