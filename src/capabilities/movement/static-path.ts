import { validWorldPosition } from '../../core/geometry/world-position';
import { movementTransition, stepDirection } from './transition';
import { withinRange } from './path-model';
import type { Position } from './step';
/** PathFinder may include both a local exit and its transported landing tile. */
export function validStaticPath(origin: Position,path: readonly Position[],arrival: Position): boolean {
  if (path.length > 2500 || !path.every(validWorldPosition)) return false;
  let current = origin;
  for (const point of path) {
    if (withinRange(current,point,0)) continue;
    const transition = movementTransition(current,stepDirection(current,point));
    if (!transition) return false;
    current = transition.landing;
  }
  return withinRange(current,arrival,0);
}
