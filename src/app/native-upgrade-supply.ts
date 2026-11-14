import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { observePopulation } from '../adapters/screeps/population';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { upgradeSupplyBody, upgradeSupplyOwner } from '../features/work/upgrade-supply';
import { reconcileRenewableFleet } from '../features/population/renewable-fleet';
import { createNativeUpgradeSupplyCycle } from './native-upgrade-supply-cycle';
import { upgradeSupplyRoutes } from './native-upgrade-supply-routes';
import { assessUpgradeSupply } from './native-upgrade-supply-assessment';
export function createNativeUpgradeSupply(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  config: (room: string) => Readonly<RuntimeConfig>): RoomFeature {
  const cycle = createNativeUpgradeSupplyCycle(state, dispatch);
  function runRoute(home: Room, target: string): void {
    const settings = config(target);
    const desired = assessUpgradeSupply(state, home.name, target, settings);
    const owner = upgradeSupplyOwner(home.name, target);
    const body = upgradeSupplyBody(home.energyCapacityAvailable)?.parts;
    const units = observePopulation();
    // Fixed legacy roster: sponsor is the supply demand scope, not the destination.
    reconcileRenewableFleet(state, { home: home.name, target: home.name, owner, desired, maximum: 8,
      enabled: desired > 0 && settings.upgradeSupplySpawningEnabled, priority: 88, priorityStep: 5, ...(body ? { body } : {}) },
    units, [], Game.time);
    const room = Game.rooms[target];
    const position = room?.storage?.pos ?? room?.controller?.pos;
    const anchor = position ? movementPosition(position) : { room: target, x: 25, y: 25 };
    for (const unit of units.filter(unit => unit.room === home.name && unit.owner === owner)) {
      cycle.run(Game.creeps[unit.name]!, { home: home.name, target, anchor, active: desired > 0,
        reserve: settings.upgradeSupplyReserve, terminalFreeReserve: settings.terminalFreeReserve });
    }
    dispatch.activate();
  }
  return { id: 'upgrade-supply', urgency: 'urgent', interval: 1, run({ room }) {
    const home = Game.rooms[room.name];
    if (!home?.controller?.my) return;
    for (const target of upgradeSupplyRoutes(state, home.name, config)) runRoute(home, target);
  } };
}
