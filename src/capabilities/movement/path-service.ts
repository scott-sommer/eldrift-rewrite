import { createBoundedCache } from '../../core/cache/bounded-cache';
import type { PathRequest, PathResult, PathSearch } from './path-model';
import { pathKey } from './path-key';
function copy(result: PathResult): PathResult {
  return result.status === 'no-route' ? { ...result } : { ...result, path: result.path.map(position => ({ ...position })) };
}
export function createPathService(search: PathSearch, clock: () => number, capacity = 200, lifetime = 25) {
  if (!Number.isSafeInteger(lifetime) || lifetime < 1) throw new Error('Invalid path lifetime');
  const cache = createBoundedCache<string, PathResult>(capacity);
  return {
    find(request: Readonly<PathRequest>): PathResult {
      const key = pathKey(request);
      const tick = clock();
      if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(tick + lifetime)) throw new Error('Invalid path clock');
      const cached = cache.get(key, tick);
      if (cached) return copy(cached);
      const result = search(request);
      // Budget-limited/failed searches must not poison subsequent attempts.
      if (result.status === 'complete') cache.set(key, copy(result), tick + lifetime);
      return copy(result);
    },
    invalidate: (request: Readonly<PathRequest>) => cache.invalidate(pathKey(request)),
    clear: () => cache.clear(),
  };
}
