import type { Position } from '../../capabilities/movement/step';
import { rankMiningTiles } from '../../capabilities/mining/rank-tiles';
import { movementPosition } from './movement-traffic';
function range(a: Position, b: RoomPosition): number {
  return a.room === b.roomName ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity;
}
/** A storage fallback is usable only from a legal harvesting tile, without abandoning the source. */
export function stationInfrastructure(access: Position[], target: RoomPosition, structures: AnyStructure[]) {
  const container = structures.find(item => item.structureType === STRUCTURE_CONTAINER && access.some(tile => range(tile, item.pos) === 0));
  const link = structures.find(item => item.structureType === STRUCTURE_LINK && item.my && item.isActive() && access.some(tile => range(tile, item.pos) <= 1));
  const storage = structures.find(item => item.structureType === STRUCTURE_STORAGE && item.my && item.isActive() && access.some(tile => range(tile, item.pos) <= 1));
  const extractor = structures.find(item => item.structureType === STRUCTURE_EXTRACTOR && item.pos.isEqualTo(target));
  const positions = { ...(container ? { container: movementPosition(container.pos) } : {}),
    ...(link ? { link: movementPosition(link.pos) } : {}), ...(storage ? { storage: movementPosition(storage.pos) } : {}) };
  return { access: rankMiningTiles(access, positions), ...(container ? { container: container.id } : {}),
    ...(link ? { link: link.id } : {}), ...(storage ? { storage: storage.id } : {}), ...(extractor ? { extractor: extractor.id } : {}) };
}
