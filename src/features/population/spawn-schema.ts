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
    owner: 'population', version: 3, initial: () => ({ requests: [] }), migrations: { 1: migrateLegacy,2: migratePlacement },
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

function migrateLegacy(value: unknown): SpawnQueue {
  if (!value || typeof value !== 'object' || !('requests' in value) || !Array.isArray(value.requests)) throw new Error('Invalid legacy spawn queue');
  if (!value.requests.every(validRequest) || value.requests.some(request => request.placement !== undefined)) throw new Error('Invalid legacy spawn placement');
  return { ...value,requests: value.requests };
}

function migratePlacement(value: unknown): SpawnQueue {
  if (!value || typeof value !== 'object' || !('requests' in value) || !Array.isArray(value.requests)) throw new Error('Invalid legacy spawn queue');
  if (!value.requests.every(validRequest) || value.requests.some(request => request.boost !== undefined)) throw new Error('Invalid legacy spawn boost');
  return { ...value,requests: value.requests };
}
