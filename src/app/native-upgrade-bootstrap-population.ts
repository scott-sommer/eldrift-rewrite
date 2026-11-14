import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { PopulationUnit } from '../capabilities/spawning/demand';
import type { SpawnRequest } from '../capabilities/spawning/request';
import { upgradeBootstrapDemand } from '../features/work/upgrade-bootstrap-policy';
import { upgradeBootstrapBody } from '../features/work/upgrade-bootstrap-body';
import { upgradeBootstrapOwner, upgradeOwner } from '../features/work/upgrade-identity';
import { reconcileRenewableFleet } from '../features/population/renewable-fleet';
export function maintainNativeUpgradeBootstrap(state: StatePort, home: Room, target: string, config: Readonly<RuntimeConfig>,
  active: boolean, units: readonly PopulationUnit[], otherQueues: readonly SpawnRequest[]): void {
  const room = Game.rooms[target];
  const demand = upgradeBootstrapDemand({ owned: !!room?.controller?.my, level: room?.controller?.level ?? 0,
    ...(room?.storage ? { storageEnergy: room.storage.store.energy } : {}), terminal: !!room?.terminal,
    progressRemaining: Math.max(0, (room?.controller?.progressTotal ?? 0) - (room?.controller?.progress ?? 0)),
    upgraders: units.filter(unit => unit.room === target && unit.owner === upgradeOwner(target)).length },
  { enabled: config.upgradeRoomEnabled && config.upgradeRoomSpawningEnabled, fleetActive: active,
    storageFloor: config.upgradeFleetStorageFloor, workers: config.upgradeFleetTarget, haulers: 8 });
  const body = upgradeBootstrapBody(Math.min(home.energyCapacityAvailable, config.upgradeFleetBodyBudget))?.parts;
  // Bootstrap units do not renew; count the fixed roster until death, avoiding seven-unit overshoot.
  reconcileRenewableFleet(state, { home: home.name, target, desired: demand.workers, enabled: demand.workers > 0,
    owner: upgradeBootstrapOwner(target), maximum: 7, priority: 65, priorityStep: 0, ...(body ? { body } : {}) },
  units, otherQueues, Game.time);
}
