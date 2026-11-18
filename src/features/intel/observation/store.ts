import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import { copyPlain } from '../../../persistence/plain-data';
import { observationSchema } from './schema';
import type { ObservationState, ObservationRequest } from './model';
import { natural, validRequest } from './validation';
const key = 'observations/empire';
/** Only the observation owner moves requests through queued, in-flight and completed states. */
export function createObservationStore(port: StatePort) {
  const read = () => peekState(port, key, observationSchema) ?? observationSchema.initial();
  function update(expected: number, change: (state: ObservationState) => void): boolean {
    const state = read();
    if (state.revision !== expected) return false;
    change(state);
    state.revision++;
    if (!observationSchema.valid(state)) throw new Error('Invalid observation transition');
    openState(port, key, observationSchema);
    saveState(port, key, observationSchema, state);
    return true;
  }
  return { read, update,
    submit(request: ObservationRequest, tick: number): boolean {
      const detached = copyPlain(request);
      validateSubmission(detached, tick);
      const state = read();
      const previous = state.requests.find(item => item.id === request.id)
        ?? [...state.flights, ...state.receipts].find(item => item.request.id === request.id)?.request;
      if (previous) {
        if (!sameRequest(previous, detached)) throw new Error('Conflicting observation request identity');
        return true;
      }
      if (state.requests.length >= 128) return false;
      return update(state.revision, next => { next.requests.push(detached); });
    },
  };
}
function sameRequest(a: ObservationRequest, b: ObservationRequest): boolean {
  return a.id === b.id && a.owner === b.owner && a.home === b.home && a.room === b.room
    && a.priority === b.priority && a.requestedAt === b.requestedAt && a.expiresAt === b.expiresAt;
}
export type ObservationStore = ReturnType<typeof createObservationStore>;

function validateSubmission(request: ObservationRequest, tick: number): void {
  if (!validRequest(request) || !natural(tick) || request.requestedAt > tick || request.expiresAt <= tick) throw new Error('Invalid observation request clock');
}
