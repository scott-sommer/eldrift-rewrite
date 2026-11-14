import { stateKey } from '../../persistence/state-key';
import type { StatePort } from '../../persistence/versioned-state';
import { createSpawnQueue } from '../population/spawn-queue';
/** Pause future births without deleting live worker tasks or other features' demand. */
export function cancelMiningDemand(state: StatePort, room: string): number {
  if (state.read(stateKey('spawning', room)) === undefined) return 0;
  const queue = createSpawnQueue(state, room);
  const requests = queue.list().filter(request => request.owner.startsWith('mining:'));
  for (const request of requests) queue.cancel(request.id, request.owner);
  return requests.length;
}

