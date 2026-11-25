import type { LaborTaskPayload } from '../features/work/labor-task';
import type { LaborActor } from './labor-task-model';
/** Compare settled cargo on a later tick, never the SDK return code or proposed quantity. */
export function settleLaborIntent(payload: LaborTaskPayload, worker: LaborActor, tick: number): 'waiting' | 'settled' | 'invalid' {
  const state = payload.progress!, pending = state.pending;
  if (!pending) return 'settled';
  if (tick <= pending.tick) return 'waiting';
  const amount = pending.kind === 'pickup' ? worker.energy-pending.before : pending.before-worker.energy;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > pending.maximum) return 'invalid';
  const field = ({ pickup: 'picked',work: 'spent',return: 'returned' } as const)[pending.kind];
  state[field] += amount;
  state.pending = null;
  return amount > 0 ? 'settled' : 'invalid';
}
