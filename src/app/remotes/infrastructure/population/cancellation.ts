import type { StatePort } from '../../../../persistence/versioned-state';
import type { createNativeDispatch } from '../../../native-dispatch';
import { remoteConstructionIdentity } from '../../../../features/remotes/infrastructure/worker-identity';
import { createSpawnQueue } from '../../../../features/population/spawn-queue';
export function cancelUnselected(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, selected: ReadonlySet<string>): void {
  const queue = createSpawnQueue(state,home);
  const known = [...queue.list().map(request => request.owner),...Object.values(Game.creeps).map(creep => creep.memory.population?.owner ?? '')];
  const cancelled = new Set(known.filter(owner => remoteConstructionIdentity(owner)?.home === home && !selected.has(owner)));
  if (!cancelled.size) return;
  queue.cancelOwners(cancelled); cancelSpawns(dispatch,home,cancelled);
}
function cancelSpawns(dispatch: ReturnType<typeof createNativeDispatch>, home: string, owners: ReadonlySet<string>): void {
  for (const spawn of Object.values(Game.spawns).filter(spawn => spawn.room.name === home)) {
    const name = spawn.spawning?.name, owner = name && Game.creeps[name]?.memory.population?.owner;
    if (name && owner && owners.has(owner)) { dispatch.structures.cancelSpawning(spawn,name,owner); dispatch.activate(); }
  }
}
