import type { Position } from '../capabilities/movement/step';
import { observeCostMatrix } from '../adapters/screeps/cost-matrix';
/** Goal selection only; actual pathfinding and movement stay in shared dispatch. */
export function nativeScoutStabilization(creep: Creep, avoid: readonly Position[], cursor: number): Position | undefined {
  const room = creep.pos.roomName, terrain = Game.map.getRoomTerrain(room);
  const matrix = observeCostMatrix(room,{ roadCost: 1, avoidUnits: false }).matrix;
  const forbidden = new Set(avoid.filter(position => position.room === room).map(position => `${position.x}:${position.y}`));
  const x = Math.min(47,Math.max(2,creep.pos.x)), y = Math.min(47,Math.max(2,creep.pos.y));
  const candidates: Position[] = [];
  for (let dx = Math.max(1,x-3); dx <= Math.min(48,x+3); dx++) {
    for (let dy = Math.max(1,y-3); dy <= Math.min(48,y+3); dy++) {
      if (!(terrain.get(dx,dy)&TERRAIN_MASK_WALL) && matrix?.get(dx,dy) !== 255 && !forbidden.has(`${dx}:${dy}`)) candidates.push({ room, x: dx, y: dy });
    }
  }
  candidates.sort((a,b) => Math.max(Math.abs(a.x-x),Math.abs(a.y-y))-Math.max(Math.abs(b.x-x),Math.abs(b.y-y)) || a.x-b.x || a.y-b.y);
  return candidates.length ? candidates[cursor%candidates.length] : undefined;
}
