import type { StatePort } from '../persistence/versioned-state';
import { openState, saveState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { ReservationDemand, ReservationTaskPayload } from './reservation-task';
import { createRemoteAssignmentStore } from '../features/remotes/assignment-store';
/** Preserve unrelated work; renew only the same assignment generation. Revoked work retires before reassignment. */
export function assignReservationTask(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>, unit: string,
  demand: ReservationDemand, tick: number, lifetime: number): string | undefined {
  validateLifetime(unit,tick,lifetime);
  const current = createRemoteAssignmentStore(state).resolve(demand,tick);
  if (current?.kind !== 'reserve') return undefined;
  const schema = taskSchema(unit,definitions), key = stateKey('tasks',unit), tasks = openState(state,key,schema);
  const previous = tasks.queue[0];
  const payload: ReservationTaskPayload = { home: current.home,token: { id: current.id,assignment: current.assignment,
    generation: current.generation,expiresAt: current.expiresAt } };
  if (previous) {
    if (previous.kind !== 'reserve' || !sameAuthority(previous.payload,payload)) return undefined;
    previous.payload = payload; previous.expiresAt = tick + lifetime;
  } else tasks.queue.push({ id: 'reservation:' + current.id + ':' + current.generation + ':' + tick,
    kind: 'reserve',phase: 'work',payload,wakeAt: tick,retries: 0,expiresAt: tick + lifetime });
  saveState(state,key,schema,tasks);
  return tasks.queue[0]!.id;
}
function sameAuthority(value: unknown, payload: ReservationTaskPayload): boolean {
  const previous = value as ReservationTaskPayload;
  return previous.home === payload.home && previous.token.assignment === payload.token.assignment
    && previous.token.generation === payload.token.generation && previous.token.id === payload.token.id;
}

function validateLifetime(unit: string, tick: number, lifetime: number): void {
  if (!unit || !Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(lifetime) || lifetime < 1
    || !Number.isSafeInteger(tick + lifetime)) throw new Error('Invalid reservation task lifetime');
}
