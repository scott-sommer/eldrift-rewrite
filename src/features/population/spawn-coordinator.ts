import { executePreparedSpawns } from './prepared-spawns';
import type { SpawnPreparation } from './prepared-spawns';
import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { createSpawnQueue } from './spawn-queue';
import { allocateSpawns } from '../../capabilities/spawning/allocate';
import { createSpawnExecutor } from '../../capabilities/spawning/execute';
import type { SpawnExecutionPorts } from '../../capabilities/spawning/execute';
import type { SpawnSlot, UnaffordablePolicy } from '../../capabilities/spawning/request';
export interface SpawnObservation {
  rooms: readonly string[];
  slots: readonly SpawnSlot[];
  energy: Readonly<Record<string, number>>;
  names: ReadonlySet<string>;
}
interface DispatchState { tick: number }
const dispatchSchema: StateSchema<DispatchState> = {
  owner: 'population', version: 1, initial: () => ({ tick: -1 }), migrations: {},
  valid(value: unknown): value is DispatchState {
    return !!value && typeof value === 'object' && 'tick' in value
      && Number.isSafeInteger(value.tick) && (value.tick as number) >= -1;
  },
};
/** Empire-wide once-per-tick composition; persist admission before any native effect. */
export function createSpawnCoordinator(state: StatePort, ports: SpawnExecutionPorts, observe: () => SpawnObservation, policy: UnaffordablePolicy, prepare?: SpawnPreparation) {
  const executor = createSpawnExecutor(ports);
  return () => {
    const tick = ports.clock();
    if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid spawn tick');
    const admission = openState(state, 'spawning/dispatch', dispatchSchema);
    if (admission.tick >= tick) return [];
    saveState(state, 'spawning/dispatch', dispatchSchema, { tick });
    const observation = observe();
    const queues = [...new Set(observation.rooms)].map(room => createSpawnQueue(state, room));
    for (const queue of queues) queue.reconcile(tick, observation.names);
    const requests = queues.flatMap(queue => queue.list());
    if (prepare) return executePreparedSpawns(requests,ports,observe,prepare,ids => { for (const queue of queues) queue.defer(ids,tick); },policy);
    const assignments = allocateSpawns(requests, observation.slots, observation.energy, observation.names, tick, policy);
    const attempted = new Set(assignments.map(assignment => assignment.request.id));
    for (const queue of queues) queue.defer(attempted, tick);
    return executor.execute(assignments);
  };
}
