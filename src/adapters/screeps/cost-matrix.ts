import type { CostObservation, CostTile } from '../../capabilities/movement/costs';
import { movementCosts, costRevision } from '../../capabilities/movement/costs';
export interface MatrixOptions { roadCost: number; avoidUnits: boolean; ignoreUnitId?: string }
function blocked(structure: AnyStructure): boolean {
  if (structure.structureType === STRUCTURE_RAMPART) return !structure.my && !structure.isPublic;
  return (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(structure.structureType);
}
function observe(room: Room, ignoreUnitId?: string): CostObservation {
  const structures = room.find(FIND_STRUCTURES);
  const obstacles: CostTile[] = structures.filter(blocked).map(item => item.pos);
  obstacles.push(...room.find(FIND_SOURCES).map(item => item.pos));
  obstacles.push(...room.find(FIND_MINERALS).map(item => item.pos));
  obstacles.push(...room.find(FIND_DEPOSITS).map(item => item.pos));
  if (room.controller) obstacles.push(room.controller.pos);
  obstacles.push(...room.find(FIND_MY_CONSTRUCTION_SITES).filter(site => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(site.structureType)).map(site => site.pos));
  const units = [...room.find(FIND_CREEPS), ...room.find(FIND_POWER_CREEPS)];
  return { roads: structures.filter(item => item.structureType === STRUCTURE_ROAD).map(item => item.pos), obstacles,
    units: units.filter(unit => unit.id !== ignoreUnitId).map(unit => unit.pos) };
}
/** Unseen rooms deliberately return terrain-only data; callers may supply retained intel separately. */
export function observeCostMatrix(roomName: string, options: MatrixOptions) {
  const room = Game.rooms[roomName];
  if (!room) return { matrix: undefined, version: `unseen:${roomName}`, visible: false };
  const cells = movementCosts(observe(room, options.ignoreUnitId), options.roadCost, options.avoidUnits);
  const matrix = new PathFinder.CostMatrix();
  for (const cell of cells) matrix.set(cell.x, cell.y, cell.cost);
  return { matrix, version: `${roomName}:${costRevision(cells)}`, visible: true };
}
