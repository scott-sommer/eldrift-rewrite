import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import { spawnQueueSchema } from './spawn-schema';
export function createSpawnQueue(port: StatePort, room: string) {
  const key = stateKey('spawning', room);
  const schema = spawnQueueSchema(room);
  const read = () => openState(port, key, schema);
  return {
    list: () => read().requests,
    submit(request: SpawnRequest): void {
      const state = read();
      const existing = state.requests.find(entry => entry.id === request.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(request)) throw new Error('Spawn request identity already exists');
        return;
      }
      state.requests.push(request);
      saveState(port, key, schema, state);
    },
    cancel(id: string, owner: string): boolean {
      const state = read();
      const index = state.requests.findIndex(request => request.id === id);
      if (index < 0) return false;
      if (state.requests[index]!.owner !== owner) throw new Error('Spawn cancellation owner mismatch');
      state.requests.splice(index, 1);
      saveState(port, key, schema, state);
      return true;
    },
    reconcile(tick: number, observedNames: ReadonlySet<string>): void {
      validTick(tick);
      const state = read();
      state.requests = state.requests.filter(request => request.expiresAt > tick && !observedNames.has(request.name));
      saveState(port, key, schema, state);
    },
    /** Persist before issuing intents: same-tick reconstruction cannot retry an uncertain attempt. */
    defer(ids: ReadonlySet<string>, tick: number): void {
      validTick(tick);
      const state = read();
      for (const request of state.requests) {
        if (ids.has(request.id)) request.readyAt = Math.max(request.readyAt, tick + 1);
      }
      state.requests = state.requests.filter(request => request.readyAt < request.expiresAt);
      saveState(port, key, schema, state);
    },
  };
}
function validTick(tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(tick + 1)) throw new Error('Invalid queue tick');
}
