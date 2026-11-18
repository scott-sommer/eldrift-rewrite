import type { PathRequest, PathProfile } from '../../capabilities/movement/path-model';
import { movementTransition, stepDirection } from '../../capabilities/movement/transition';
import type { Position } from '../../capabilities/movement/step';
type NativePath = ReturnType<typeof PathFinder.search>;
type Matrices = (room: string, profile: Readonly<PathProfile>) => CostMatrix | false | undefined;
/** PathFinder permits outward arrival-border steps that the engine cannot issue. Bounce inward first. */
export function repairBorderPath(request: Readonly<PathRequest>, matrix: Matrices, initial: NativePath,
  search: (origin: Position, maximumOps: number) => NativePath): NativePath {
  const first = initial.path[0];
  if (!first || stepDirection(request.origin,{ room: first.roomName,x: first.x,y: first.y })) return initial;
  const candidates = inwardSteps(request.origin), costs = matrix(request.origin.room,request.profile);
  let operations = initial.ops, best: NativePath = { ...initial,path: [],incomplete: true };
  for (const [index,point] of candidates.entries()) {
    const remaining = request.profile.maxOps-operations;
    if (remaining < 1) break;
    const cost = entryCost(point,costs,request.profile);
    if (cost === 255) continue;
    const result = search(point,Math.max(1,Math.floor(remaining/(candidates.length-index))));
    operations += result.ops;
    best = { ...result,path: [new RoomPosition(point.x,point.y,point.room),...result.path],cost: result.cost+cost,ops: operations };
    if (!result.incomplete) return best;
  }
  return { ...best,ops: operations };
}
function inwardSteps(origin: Position): Position[] {
  const steps = Array.from({ length: 8 },(_,index) => movementTransition(origin,index+1)?.landing)
    .filter((point): point is Position => !!point && point.room === origin.room && point.x > 0 && point.x < 49 && point.y > 0 && point.y < 49);
  if (origin.x > 0 && origin.x < 49 && origin.y > 0 && origin.y < 49) return [];
  return steps.sort((a,b) => distance(a,origin)-distance(b,origin));
}
function distance(a: Position, b: Position): number { return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }
function entryCost(point: Position, matrix: CostMatrix | false | undefined, profile: PathProfile): number {
  if (matrix === false) return 255;
  const value = matrix?.get(point.x,point.y) ?? 0;
  if (value) return value;
  const terrain = Game.map.getRoomTerrain(point.room).get(point.x,point.y);
  if (terrain & TERRAIN_MASK_WALL) return 255;
  return terrain & TERRAIN_MASK_SWAMP ? profile.swampCost : profile.plainCost;
}
