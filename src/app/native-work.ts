import { assignNativeWorkerSource } from './native-worker-assignment';
import { upgradeBootstrapOwner } from '../features/work/upgrade-identity';
import { createNativeWorkerCargo } from './native-worker-cargo';
import { maintainNativeWorkers } from './native-worker-population';
import { createNativeWorkerCollection } from './native-worker-collection';
import type { RuntimeConfig } from '../config/model';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeWork } from '../adapters/screeps/work-execution';
import { assessNativeWork } from './native-work-assessment';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { nativeWorkerSettings } from './native-worker-settings';
import { defaultWorkPolicy } from '../features/work/policy';
import { selectWork } from '../features/work/select';
import { createWorkTaskBehavior } from './work-task';
import { reconcileWorkTask } from './reconcile-work-task';
import { createTaskRunner } from './task-runner';
/** Work and cargo disposal share ownership; worker collection remains a separate capability. */
export function createNativeWorkFeature(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  otherDefinitions: Readonly<Record<string, TaskDefinition>> = {},
  recovering: (room: Room, config: Readonly<RuntimeConfig>) => boolean = () => false) {
  const work = createNativeWork(dispatch.arbiter, dispatch.movement);
  const collect = createNativeWorkerCollection(state, dispatch);
  const definitions = { work: createWorkTaskBehavior<{ creep: Creep; config: Readonly<RuntimeConfig> }>({
    identity: ({ creep }) => ({ name: creep.name, id: creep.id }),
    run: ({ creep }, payload, owner) => work(creep, payload.order, owner),
    supply: { energy: ({ creep }) => creep.store.energy, free: ({ creep }) => creep.store.getFreeCapacity(),
      collect: ({ creep, config }, payload, owner) => collect(creep, payload.home, owner, config) },
  }) };
  const cargo = createNativeWorkerCargo(state, dispatch, { ...otherDefinitions, ...definitions });
  const schemas = { ...otherDefinitions, ...definitions, ...cargo.definitions };
  const execute = createTaskRunner(state, definitions, () => Game.time, schemas);
  const feature: RoomFeature = { id: 'work', urgency: 'urgent', interval: 1, run({ room: view, config }) {
    const room = Game.rooms[view.name];
    if (!room?.controller?.my) return;
    const recoveryActive = recovering(room, config.values);
    maintainNativeWorkers(state, room, config.values, recoveryActive);
    if (config.values.workersEnabled) dispatch.activate();
    const workers = Object.values(Game.creeps).filter(creep => !creep.spawning && creep.memory.population?.home === view.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    const assessment = assessNativeWork(state, room);
    for (const creep of workers) {
      const settings = nativeWorkerSettings(creep.memory.population!.owner, view.name, config.values);
      if (settings) runWorker(creep, room, settings, recoveryActive, assessment);
    }
  } };
  function runWorker(creep: Creep, room: Room, settings: Readonly<RuntimeConfig>, recoveryActive: boolean,
    assessment: ReturnType<typeof assessNativeWork>): void {
    assignNativeWorkerSource(creep, room, settings);
    if (cargo.run(creep, room.name, settings)) return;
    const bootstrap = creep.memory.population?.owner === upgradeBootstrapOwner(room.name);
    const policy = { ...defaultWorkPolicy, wallHits: settings.workerWallHits, rampartHits: settings.workerRampartHits,
      downgradeThreshold: settings.workerDowngradeThreshold,
      allowUpgrade: bootstrap || !recoveryActive && (!room.storage || room.storage.store.energy > settings.workerUpgradeReserve) };
    const origin = creep.pos.roomName === room.name ? movementPosition(creep.pos) : { room: room.name, x: 25, y: 25 };
    reconcileWorkTask(state, schemas, { name: creep.name, id: creep.id, home: room.name }, Game.time,
      current => settings.workersEnabled ? selectWork(assessment, origin, settings.workerMode, policy, current?.id) : undefined);
    if (!settings.workersEnabled) return;
    dispatch.activate(); execute(creep.name, { creep, config: settings });
  }
  return { feature, definitions: { ...definitions, ...cargo.definitions } };
}
