import type { StateSchema } from '../../persistence/versioned-state';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import { validateRequest } from '../../capabilities/spawning/allocate';
export interface SpawnQueue { requests: SpawnRequest[] }
function validRequest(value: unknown): value is SpawnRequest {
  if (!value || typeof value !== 'object') return false;
  try {
    validateRequest(value as SpawnRequest);
    return true;
  } catch { return false; }
}
export function spawnQueueSchema(room: string): StateSchema<SpawnQueue> {
  return {
    owner: 'population', version: 1, initial: () => ({ requests: [] }), migrations: {},
    valid(value: unknown): value is SpawnQueue {
      if (!value || typeof value !== 'object' || !('requests' in value)) return false;
      const requests = value.requests;
      if (!Array.isArray(requests) || requests.length > 200 || !requests.every(validRequest)) return false;
      return requests.every(request => request.room === room)
        && new Set(requests.map(request => request.id)).size === requests.length
        && new Set(requests.map(request => request.name)).size === requests.length;
    },
  };
}
