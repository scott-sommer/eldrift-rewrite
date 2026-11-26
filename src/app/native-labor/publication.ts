import { createLaborPublication } from '../labor-publication';
import type { StatePort } from '../../persistence/versioned-state';
import type { TaskDefinition } from '../../persistence/tasks/schema';
/** No automatic policy: callers supply current proposal/economic admission to publish. */
export function createNativeLaborPublication(state: StatePort, home: string, definitions: Readonly<Record<string,TaskDefinition>> = {}) {
  return createLaborPublication(state,home,{ now: () => Game.time,occupied: name => !!Game.creeps[name],born(request) {
    const creep = Game.creeps[request.name];
    return !!creep?.my && creep.memory.population?.owner === request.owner && creep.memory.population.home === (request.home ?? request.room);
  } },definitions);
}
