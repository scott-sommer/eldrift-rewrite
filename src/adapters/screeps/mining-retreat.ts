import { adjacentWorkTiles } from '../../capabilities/movement/work-tiles';
import { selectRetreat } from '../../capabilities/movement/retreat';
import { observeCostMatrix } from './cost-matrix';
import { movementPosition } from './movement-traffic';
export function miningRetreat(anchor: RoomPosition, threats: readonly Creep[]) {
  const matrix = observeCostMatrix(anchor.roomName, { roadCost: 1, avoidUnits: false }).matrix;
  if (!matrix) return undefined;
  const terrain = Game.map.getRoomTerrain(anchor.roomName);
  const candidates = adjacentWorkTiles(movementPosition(anchor)).filter(tile =>
    matrix.get(tile.x, tile.y) !== 255 && (terrain.get(tile.x, tile.y) & TERRAIN_MASK_WALL) === 0);
  return selectRetreat(candidates, threats.map(creep => movementPosition(creep.pos)));
}
