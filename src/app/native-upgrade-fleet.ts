import { maintainUpgradeMasterFleet } from './native-upgrade-master-fleet';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { maintainUpgradeFleet } from '../features/work/upgrade-fleet';
import { refreshUpgradeFleetGate } from '../features/work/upgrade-fleet-gate';
import { upgradeTarget } from '../features/work/upgrade-identity';
import { upgraderBody } from '../capabilities/spawning/worker-recipes';
import { observePopulation } from '../adapters/screeps/population';
import { observeUpgradeEmpire, observeUpgradeLayout } from './native-upgrade-layout';
type Configuration = (room: string) => Readonly<RuntimeConfig>;
export function createNativeUpgradeFleet(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: Configuration): RoomFeature {
  const pending = (room: string) => state.read(stateKey('spawning', room)) === undefined ? [] : createSpawnQueue(state, room).list();
  function runTarget(home: Room, target: string): void {
    const settings = config(target);
    const room = Game.rooms[target];
    const active = configured(home.name, target, settings) && refreshUpgradeFleetGate(state, target, observeUpgradeEmpire().empireEnergy,
      settings.upgradeFleetStartEnergy, settings.upgradeFleetStopEnergy);
    const enabled = active && settings.upgradeRoomEnabled && settings.upgradeRoomSpawningEnabled && eligible(room, settings);
    const body = enabled ? upgraderBody(Math.min(home.energyCapacityAvailable, settings.upgradeFleetBodyBudget), room!.controller!.level, true)?.parts : undefined;
    const otherQueues = Object.values(Game.rooms).filter(room => room.controller?.my && room.name !== home.name).flatMap(room => pending(room.name));
    const units = observePopulation();
    maintainUpgradeMasterFleet(state, home, target, settings, active, units, otherQueues);
    maintainUpgradeFleet(state, { home: home.name, target, enabled, desired: settings.upgradeFleetTarget, ...(body ? { body } : {}) },
      units, otherQueues, Game.time);
    dispatch.activate();
  }
  return { id: 'upgrade-fleet', urgency: 'urgent', interval: 1, run({ room: view }) {
    const home = Game.rooms[view.name];
    if (!home?.controller?.my) return;
    const targets = new Set(pending(home.name).map(request => upgradeTarget(request.owner)).filter((room): room is string => !!room));
    for (const target of Object.values(Game.rooms)) {
      const settings = config(target.name);
      if ((settings.upgradeRoomSpawningEnabled || settings.upgradeMasterSpawningEnabled) && (settings.upgradeRoomSponsor || target.name) === home.name) targets.add(target.name);
    }
    for (const target of [...targets].sort()) runTarget(home, target);
  } };
}
function configured(home: string, target: string, config: Readonly<RuntimeConfig>): boolean {
  const spawning = (config.upgradeRoomEnabled && config.upgradeRoomSpawningEnabled) || (config.upgradeMasterEnabled && config.upgradeMasterSpawningEnabled);
  return spawning && (config.upgradeRoomSponsor || target) === home;
}
function eligible(target: Room | undefined, config: Readonly<RuntimeConfig>): boolean {
  if (!target?.controller?.my || target.controller.level === 8) return false;
  return (target.storage?.store.energy ?? 0) > config.upgradeFleetStorageFloor && !!observeUpgradeLayout(target);
}
