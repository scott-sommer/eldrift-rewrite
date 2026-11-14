import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observePopulation } from '../adapters/screeps/population';
import { reconcileWorkerPopulation } from '../features/work/population';
import { isWorkOwner } from '../features/work/identity';
export function maintainNativeWorkers(state: StatePort, room: Room, config: Readonly<RuntimeConfig>, recoveryActive = false): void {
  const units = observePopulation();
  const existing = units.some(unit => unit.room === room.name && isWorkOwner(unit.owner, room.name));
  const budget = Math.min(config.workerBodyBudget, existing ? room.energyCapacityAvailable : room.energyAvailable);
  reconcileWorkerPopulation(state, { room: room.name, level: room.controller!.level, budget,
    enabled: config.workersEnabled && config.workerSpawningEnabled, fallback: config.workerMode,
    targets: { builder: config.workerBuilderTarget, fortifier: config.workerFortifierTarget, upgrader: recoveryActive ? 0 : config.workerUpgraderTarget } }, units, Game.time);
}
