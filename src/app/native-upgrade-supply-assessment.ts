import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { upgradeBootstrapDemand } from '../features/work/upgrade-bootstrap-policy';
import { refreshUpgradeFleetGate } from '../features/work/upgrade-fleet-gate';
import { observeUpgradeEmpire } from './native-upgrade-layout';
export function assessUpgradeSupply(state: StatePort, home: string, target: string, config: Readonly<RuntimeConfig>): number {
  const room = Game.rooms[target];
  const enabled = config.upgradeRoomEnabled && config.upgradeSupplyEnabled && config.upgradeRoomSponsor === home;
  const active = enabled && refreshUpgradeFleetGate(state, target, observeUpgradeEmpire().empireEnergy,
    config.upgradeFleetStartEnergy, config.upgradeFleetStopEnergy);
  return upgradeBootstrapDemand({ owned: !!room?.controller?.my, level: room?.controller?.level ?? 0,
    ...(room?.storage ? { storageEnergy: room.storage.store.energy } : {}), terminal: !!room?.terminal,
    progressRemaining: Math.max(0, (room?.controller?.progressTotal ?? 0) - (room?.controller?.progress ?? 0)), upgraders: 0 },
  { enabled, fleetActive: active, storageFloor: config.upgradeFleetStorageFloor, workers: 0, haulers: config.upgradeSupplyTarget }).haulers;
}
