import { planUpgradeStations } from '../features/work/upgrade-stations';
import { observeCostMatrix } from '../adapters/screeps/cost-matrix';
import { movementPosition } from '../adapters/screeps/movement-traffic';
export function observeUpgradeLayout(room: Room) {
  const storage = room.storage;
  const controller = room.controller;
  if (!storage?.my || !storage.isActive() || !controller?.my) return undefined;
  const structures = room.find(FIND_MY_STRUCTURES).filter(item => item.isActive()).sort((a, b) => a.id.localeCompare(b.id));
  const spawn = structures.find((item): item is StructureSpawn => item.structureType === STRUCTURE_SPAWN);
  const lab = structures.find((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  if (!spawn || !lab) return undefined;
  const matrix = observeCostMatrix(room.name, { roadCost: 1, avoidUnits: false }).matrix!;
  const terrain = room.getTerrain();
  const plan = planUpgradeStations({ storage: movementPosition(storage.pos), controller: movementPosition(controller.pos),
    spawn: movementPosition(spawn.pos), lab: movementPosition(lab.pos) },
  position => matrix.get(position.x, position.y) < 255 && (terrain.get(position.x, position.y) & TERRAIN_MASK_WALL) === 0);
  return plan.status === 'ready' ? { storage, controller, spawn, lab, stations: plan.stations } : undefined;
}
export type NativeUpgradeLayout = NonNullable<ReturnType<typeof observeUpgradeLayout>>;
export function observeUpgradeEmpire() {
  const rooms = Object.values(Game.rooms).filter(room => room.controller?.my);
  const empireEnergy = rooms.reduce((total, room) => total + (room.storage?.store.energy ?? 0) + (room.terminal?.store.energy ?? 0), 0);
  return { empireEnergy, ownedRooms: rooms.length };
}
