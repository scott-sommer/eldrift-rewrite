import { awaitsNativeMasterHandoff } from './native-master-handoff';
import { haulingOwner } from '../features/logistics/identity';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { observeUpgradeMasterLayout } from './native-upgrade-master-layout';
import { generateNativeUpgradeService } from './native-upgrade-service';
import { createNativeHaulingTask } from './native-hauling-task';
import { createTaskRunner } from './task-runner';
import { settleHaulingTask } from './settle-hauling-task';
import { recoverNativeCargo } from './native-cargo-recovery';
import { selectHaulingTask } from './select-hauling-task';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { logisticsEndpoint, observeHauling } from '../adapters/screeps/hauling-observation';
import { upgradeMasterOwner } from '../features/work/upgrade-identity';
type Dispatch = ReturnType<typeof createNativeDispatch>;
/** Fixed-station service reuses confirmed hauling; task movement cannot leave the station. */
export function createNativeUpgradeMaster(state: StatePort, dispatch: Dispatch,
  recovering: (room: Room, config: Readonly<RuntimeConfig>) => boolean) {
  const stationary = { arbiter: dispatch.arbiter, movement: { ...dispatch.movement,
    move: () => ({ status: 'blocked' as const, reason: 'master-station-required', retryAt: Game.time + 1 }) } };
  const definitions = { haul: createNativeHaulingTask(state, stationary, { version: 'upgrade-master', maximumRooms: 16, costs: {}, blockedRooms: [] }) };
  const execute = createTaskRunner(state, definitions, () => Game.time);
  function run(creep: Creep, room: Room, config: Readonly<RuntimeConfig>, active: boolean): void {
    if (room.controller!.level < 6 && !room.storage) {
      creep.memory.population = { home: room.name, owner: haulingOwner(room.name) };
      return;
    }
    const layout = observeUpgradeMasterLayout(room);
    if (!layout) return;
    dispatch.activate();
    const owner = upgradeMasterOwner(room.name);
    if (creep.room.name !== room.name || !creep.pos.isEqualTo(layout.station.x, layout.station.y)) {
      dispatch.movement.move(creep, { owner, destination: layout.station, range: 0,
        policy: { version: 'upgrade-master-travel', maximumRooms: 16, costs: {}, blockedRooms: [] } });
      return;
    }
    if (awaitsNativeMasterHandoff(creep, room)) return;
    recoverNativeCargo(state, definitions, creep, room.name, config.terminalFreeReserve, () => true, sink => creep.pos.isNearTo(sink));
    selectHaulingTask(state, definitions, { home: room.name, name: creep.name, unitId: creep.id,
      tick: Game.time, cargoTotal: creep.store.getUsedCapacity() }, request => observeHauling(creep, request),
    request => active && request.owner === 'upgrade-service:' + room.name && adjacent(creep, request.source) && adjacent(creep, request.sink));
    execute(creep.name, creep);
    if (creep.ticksToLive! < config.upgradeMasterRenewBelow) dispatch.structures.renew(layout.spawn, creep, owner);
  }
  const feature: RoomFeature = { id: 'upgrade-service-master', urgency: 'urgent', interval: 1, run({ room: view, config }) {
    const room = Game.rooms[view.name];
    if (!room?.controller?.my) return;
    const units = Object.values(Game.creeps).filter(creep => !creep.spawning && creep.memory.population?.home === room.name
      && creep.memory.population.owner === upgradeMasterOwner(room.name));
    for (const creep of units) settleHaulingTask(state, definitions, creep, observeTransfer);
    if (!config.values.upgradeMasterEnabled) return;
    const active = config.values.upgradeRoomServiceEnabled && !(recovering(room, config.values) && config.values.recoveryEconomyEnabled);
    for (const creep of units) run(creep, room, config.values, active);
    generateNativeUpgradeService(state, room, config.values, active);
  } };
  return { feature, definitions };
}
function adjacent(creep: Creep, id: string): boolean {
  const target = logisticsEndpoint(id);
  return !!target && creep.pos.isNearTo(target);
}
