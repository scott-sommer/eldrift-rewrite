import { nativeCostObservations } from './cost-observations';
import { movementCosts, costRevision } from '../../capabilities/movement/costs';
export interface MatrixOptions { roadCost: number; avoidUnits: boolean; ignoreUnitId?: string }
/** Unseen rooms deliberately return terrain-only data; callers may supply retained intel separately. */
export function observeCostMatrix(roomName: string, options: MatrixOptions, read = nativeCostObservations) {
  const room = Game.rooms[roomName];
  if (!room) return { matrix: undefined, version: `unseen:${roomName}`, visible: false };
  const facts = read(room);
  const cells = movementCosts({ ...facts,units: facts.units.filter(unit => unit.id !== options.ignoreUnitId) },options.roadCost,options.avoidUnits);
  const matrix = new PathFinder.CostMatrix();
  for (const cell of cells) matrix.set(cell.x, cell.y, cell.cost);
  return { matrix, version: `${roomName}:${costRevision(cells)}`, visible: true };
}
