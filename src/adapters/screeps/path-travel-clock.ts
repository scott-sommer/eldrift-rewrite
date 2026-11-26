import type { Mobility } from '../../capabilities/movement/mobility';
import type { Position } from '../../capabilities/movement/step';
import { movementTransition, stepDirection } from '../../capabilities/movement/transition';
/** Elapsed frames to an action on a static path, including native edge transport and final fatigue. */
export function pathTravelClock(origin: Position, path: readonly Position[], mobility: Mobility, rate: (point: Position) => 1 | 2 | 10): number | undefined {
  if (!mobility.mobile) return undefined;
  let current = origin, ticks = 0, fatigue = 0;
  for (const point of path) {
    if (same(current,point)) continue;
    const step = movementTransition(current,stepDirection(current,point));
    if (!step) return undefined;
    ticks += Math.ceil(fatigue/mobility.recovery)+1;
    fatigue = edge(step.local) && !edge(current) ? 0 : Math.max(0,mobility.weight*rate(step.local)-mobility.recovery);
    current = step.landing;
  }
  return ticks;
}
function edge(point: Position): boolean { return point.x === 0 || point.x === 49 || point.y === 0 || point.y === 49; }
function same(a: Position, b: Position): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }
