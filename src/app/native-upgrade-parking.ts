import type { StatePort } from '../persistence/versioned-state';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { upgradeOwner, upgradeMasterOwner } from '../features/work/upgrade-identity';
import { planUpgradeParking } from '../features/work/upgrade-parking';
import { observeCostMatrix } from '../adapters/screeps/cost-matrix';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { settleHaulingTask } from './settle-hauling-task';
/** Visible lost targets still own specialist lifecycle; absence of visibility never proves loss. */
export function createNativeUpgradeParking(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  definitions: Readonly<Record<string, TaskDefinition>>): RoomFeature {
  return { id: 'upgrade-parking', scope: 'visible', urgency: 'urgent', interval: 1, run({ room: view, config }) {
    const room = Game.rooms[view.name];
    if (!room?.controller || room.controller.my) return;
    const roster = Object.values(Game.creeps).filter(creep => !creep.spawning && creep.memory.population?.home === room.name);
    const masters = roster.filter(creep => creep.memory.population!.owner === upgradeMasterOwner(room.name));
    for (const creep of masters) settleHaulingTask(state, definitions, creep, observeTransfer);
    const units = roster.filter(creep => creep.memory.population!.owner === upgradeOwner(room.name) && config.values.upgradeRoomEnabled
      || creep.memory.population!.owner === upgradeMasterOwner(room.name) && config.values.upgradeMasterEnabled);
    if (!units.length) return;
    const stations = observeUpgradeParking(room, units);
    dispatch.activate();
    for (const creep of units) {
      const destination = stations.get(creep.id);
      if (!destination) continue;
      dispatch.movement.move(creep, { owner: creep.memory.population!.owner, destination, range: 0,
        policy: { version: 'upgrade-parking', maximumRooms: 16, blockedRooms: [], costs: {} } });
    }
  } };
}
export function observeUpgradeParking(room: Room, units: readonly Creep[]) {
  const controller = movementPosition(room.controller!.pos);
  const spawn = room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_SPAWN).sort((a, b) => a.id.localeCompare(b.id))[0];
  const anchor = spawn ? movementPosition(spawn.pos) : { ...controller, x: Math.min(46, controller.x + 2), y: Math.min(46, controller.y + 2) };
  const matrix = observeCostMatrix(room.name, { roadCost: 1, avoidUnits: false }).matrix!;
  const terrain = room.getTerrain();
  const ownIds = new Set(units.map(creep => creep.id as string));
  const occupied = new Set([...room.find(FIND_CREEPS), ...room.find(FIND_POWER_CREEPS)]
    .filter(creep => !ownIds.has(creep.id)).map(creep => creep.pos.x + ':' + creep.pos.y));
  return planUpgradeParking(controller, anchor, units.map(creep => ({ id: creep.id, position: movementPosition(creep.pos) })),
    position => matrix.get(position.x, position.y) < 255 && !occupied.has(position.x + ':' + position.y)
      && (terrain.get(position.x, position.y) & TERRAIN_MASK_WALL) === 0);
}
