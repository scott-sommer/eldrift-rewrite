import { maintainNativeWorkers } from './native-worker-population';
import { createNativeWorkerCollection } from './native-worker-collection';
import type { RuntimeConfig } from '../config/model';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeWork } from '../adapters/screeps/work-execution';
import { observeWorkAssessment } from '../adapters/screeps/work-assessment';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { isWorkOwner, workModeFor } from '../features/work/identity';
import { defaultWorkPolicy } from '../features/work/policy';
import { selectWork } from '../features/work/select';
import { createWorkTaskBehavior } from './work-task';
import { reconcileWorkTask } from './reconcile-work-task';
import { createTaskRunner } from './task-runner';
/** Local worker execution owns no mining/hauling actions; energy supply remains a separate policy. */
export function createNativeWorkFeature(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  otherDefinitions: Readonly<Record<string, TaskDefinition>> = {}) {
  const work = createNativeWork(dispatch.arbiter, dispatch.movement);
  const collect = createNativeWorkerCollection(state, dispatch);
  const definitions = { work: createWorkTaskBehavior<{ creep: Creep; config: Readonly<RuntimeConfig> }>({
    identity: ({ creep }) => ({ name: creep.name, id: creep.id }),
    run: ({ creep }, payload, owner) => work(creep, payload.order, owner),
    supply: { energy: ({ creep }) => creep.store.energy, free: ({ creep }) => creep.store.getFreeCapacity(),
      collect: ({ creep, config }, payload, owner) => collect(creep, payload.home, owner, config) },
  }) };
  const schemas = { ...otherDefinitions, ...definitions };
  const execute = createTaskRunner(state, definitions, () => Game.time, schemas);
  const feature: RoomFeature = { id: 'work', urgency: 'urgent', interval: 1, run({ room: view, config }) {
    const room = Game.rooms[view.name];
    if (!room?.controller?.my) return;
    maintainNativeWorkers(state, room, config.values);
    if (config.values.workersEnabled) dispatch.activate();
    const workers = Object.values(Game.creeps).filter(creep => !creep.spawning && creep.memory.population?.home === view.name &&
      isWorkOwner(creep.memory.population.owner, view.name)).sort((a, b) => a.name.localeCompare(b.name));
    const assessment = config.values.workersEnabled ? observeWorkAssessment(room) : undefined;
    const policy = { ...defaultWorkPolicy, wallHits: config.values.workerWallHits, rampartHits: config.values.workerRampartHits,
      downgradeThreshold: config.values.workerDowngradeThreshold, allowUpgrade: !room.storage || room.storage.store.energy > config.values.workerUpgradeReserve };
    for (const creep of workers) {
      reconcileWorkTask(state, schemas, { name: creep.name, id: creep.id, home: view.name }, Game.time,
        current => assessment ? selectWork(assessment, movementPosition(creep.pos), workModeFor(creep.memory.population!.owner, view.name, config.values.workerMode)!, policy, current?.id) : undefined);
      if (!config.values.workersEnabled) continue;
      dispatch.activate(); execute(creep.name, { creep, config: config.values });
    }
  } };
  return { feature, definitions };
}
