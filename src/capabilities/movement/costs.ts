export interface CostTile { x: number; y: number }
export interface CostObservation { roads: readonly CostTile[]; obstacles: readonly CostTile[]; units: readonly CostTile[] }
export interface CostCell extends CostTile { cost: number }
/** Fixed obstacles win over roads; unit occupancy is an optional overlay. */
export function movementCosts(observation: CostObservation, roadCost: number, avoidUnits: boolean): CostCell[] {
  if (!Number.isSafeInteger(roadCost) || roadCost < 1 || roadCost > 254) throw new Error('Invalid road cost');
  const cells = new Map<number, CostCell>();
  const write = (tile: CostTile, cost: number) => {
    if (!Number.isInteger(tile.x) || !Number.isInteger(tile.y) || tile.x < 0 || tile.y < 0 || tile.x > 49 || tile.y > 49) throw new Error('Invalid cost tile');
    cells.set(tile.y * 50 + tile.x, { x: tile.x, y: tile.y, cost });
  };
  for (const tile of observation.roads) write(tile, roadCost);
  for (const tile of observation.obstacles) write(tile, 255);
  if (avoidUnits) for (const tile of observation.units) write(tile, 255);
  return [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}
export function costRevision(cells: readonly CostCell[]): string {
  return JSON.stringify(cells.map(cell => [cell.x, cell.y, cell.cost]));
}
