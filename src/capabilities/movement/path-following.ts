import { createBoundedCache } from '../../core/cache/bounded-cache';
import { pathContextKey } from './path-key';
import { withinRange } from './path-model';
import type { PathRequest, PathResult } from './path-model';
import type { Position } from './step';
interface FollowedPath { context: string; origin: Position; path: Position[] }
/** Disposable complete-path tails. Every lookup uses a newly prepared policy/topology/mobility context. */
export function createPathFollowing(capacity = 200, lifetime = 25, maximumSteps = 250) {
  if (![lifetime,maximumSteps].every(value => Number.isSafeInteger(value) && value >= 1)) throw new Error('Invalid followed path limits');
  const cache = createBoundedCache<string,FollowedPath>(capacity);
  function expiry(tick: number): number {
    if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(tick+lifetime)) throw new Error('Invalid followed path clock');
    return tick+lifetime;
  }
  function next(unit: string, request: Readonly<PathRequest>, tick: number): Position | undefined {
    expiry(tick);
    const context = pathContextKey(request), saved = cache.get(unit,tick);
    if (!saved || saved.context !== context) { cache.invalidate(unit); return undefined; }
    const index = withinRange(request.origin,saved.origin,0) ? -1 : saved.path.findIndex(point => withinRange(request.origin,point,0));
    if (index === -1 && !withinRange(request.origin,saved.origin,0)) { cache.invalidate(unit); return undefined; }
    const point = saved.path[index+1];
    return point ? { ...point } : undefined;
  }
  return { next,forget: (unit: string) => cache.invalidate(unit),
    remember(unit: string, request: Readonly<PathRequest>, result: PathResult, tick: number): void {
      const expiresAt = expiry(tick); cache.invalidate(unit);
      if (result.status !== 'complete' || result.path.length === 0 || result.path.length > maximumSteps) return;
      cache.set(unit,{ context: pathContextKey(request),origin: { ...request.origin },path: result.path.map(point => ({ ...point })) },expiresAt);
    },
  };
}
