import { movementCosts, costRevision } from '../../capabilities/movement/costs';
import type { CostObservation } from '../../capabilities/movement/costs';
/** Retained plain infrastructure never becomes an assumed empty unseen room. */
export function createStaticCostMatrix(observation: CostObservation, roadCost: number) {
  const cells = movementCosts(observation,roadCost,false), matrix = new PathFinder.CostMatrix();
  for (const cell of cells) matrix.set(cell.x,cell.y,cell.cost);
  return { matrix, version: costRevision(cells) };
}
