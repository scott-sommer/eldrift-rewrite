import { planUpgradeMasterStation } from '../features/work/upgrade-master-station';
import { observeCostMatrix } from '../adapters/screeps/cost-matrix';
import { movementPosition } from '../adapters/screeps/movement-traffic';
export function observeUpgradeMasterLayout(room: Room) {
  const storage = room.storage, terminal = room.terminal;
  if (!room.controller?.my || !storage?.my || !terminal?.my) return undefined;
  const structures = room.find(FIND_MY_STRUCTURES).sort((a, b) => a.id.localeCompare(b.id));
  const spawn = structures.find((item): item is StructureSpawn => item.structureType === STRUCTURE_SPAWN && item.isActive());
  const lab = structures.find((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  if (!spawn || !lab) return undefined;
  const matrix = observeCostMatrix(room.name, { roadCost: 1, avoidUnits: false }).matrix!;
  const terrain = room.getTerrain();
  const station = planUpgradeMasterStation({ storage: movementPosition(storage.pos), terminal: movementPosition(terminal.pos),
    spawn: movementPosition(spawn.pos), lab: movementPosition(lab.pos) },
  position => matrix.get(position.x, position.y) < 255 && (terrain.get(position.x, position.y) & TERRAIN_MASK_WALL) === 0);
  return station ? { station, storage, terminal, spawn, lab } : undefined;
}
