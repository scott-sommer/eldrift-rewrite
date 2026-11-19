import type { StatePort } from '../../persistence/versioned-state';
import type { createNativeDispatch } from '../native-dispatch';
import { createSpawnQueue } from '../../features/population/spawn-queue';
/** Cancellation is restricted to one feature family and population home. */
export function cancelRemotePopulation(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, selected: ReadonlySet<string>, identity: (owner: string) => { home: string } | undefined): void {
  const queue = createSpawnQueue(state,home), known = [...queue.list().map(request => request.owner),...Object.values(Game.creeps).map(creep => creep.memory.population?.owner ?? '')];
  const cancelled = new Set(known.filter(owner => identity(owner)?.home === home && !selected.has(owner)));
  if (!cancelled.size) return;
  queue.cancelOwners(cancelled);
  for (const spawn of Object.values(Game.spawns).filter(spawn => spawn.room.name === home)) {
    const name = spawn.spawning?.name, owner = name && Game.creeps[name]?.memory.population?.owner;
    if (name && owner && cancelled.has(owner)) { dispatch.structures.cancelSpawning(spawn,name,owner); dispatch.activate(); }
  }
}
