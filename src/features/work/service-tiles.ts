import type { Position } from '../../capabilities/movement/step';
import { adjacentWorkTiles } from '../../capabilities/movement/work-tiles';
/** Deterministic interior service geometry; path feasibility remains the route owner's decision. */
export function selectWorkService(target: Position, origin: Position, range: 1 | 3, standable: (point: Position) => boolean): Position | undefined {
  if (target.room !== origin.room) return undefined;
  const points = range === 1 ? adjacentWorkTiles(target) : workTiles(target);
  return points.filter(standable).sort((a,b) => distance(a,origin)-distance(b,origin) || distance(a,target)-distance(b,target) || a.x-b.x || a.y-b.y)[0];
}
function workTiles(target: Position): Position[] {
  const points: Position[] = [];
  for (let x = Math.max(1,target.x-3); x <= Math.min(48,target.x+3); x++) {
    for (let y = Math.max(1,target.y-3); y <= Math.min(48,target.y+3); y++) points.push({ room: target.room,x,y });
  }
  return points;
}
function distance(a: Position, b: Position): number { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }
