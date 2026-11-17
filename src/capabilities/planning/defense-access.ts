import { adjacentTiles, tileAt, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
/** Flood friendly movement, then dilate reachable worker positions by the configured repair range. */
export function defenseAccess(walkable: readonly boolean[], origins: readonly Tile[], repairRange: number) {
  validateAccess(walkable, repairRange);
  const friendlyReachable = Array<boolean>(2500).fill(false), queue: number[] = [];
  for (const origin of origins) {
    const index = tileIndex(origin);
    if (!walkable[index]) throw new Error('Blocked defense access origin');
    if (!friendlyReachable[index]) { friendlyReachable[index] = true; queue.push(index); }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const tile of adjacentTiles(tileAt(queue[cursor]!))) {
      const index = tileIndex(tile);
      if (!walkable[index] || friendlyReachable[index]) continue;
      friendlyReachable[index] = true; queue.push(index);
    }
  }
  return { friendlyReachable, repairReachable: repairMask(friendlyReachable, repairRange) };
}
/** Multi-source distance dilation is O(room area), including blocked target cells workers can repair. */
function repairMask(reachable: readonly boolean[], range: number): boolean[] {
  const distance = reachable.map(value => value ? 0 : Infinity);
  const queue = reachable.flatMap((value, index) => value ? [index] : []);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor]!, next = distance[index]! + 1;
    if (next > range) continue;
    for (const tile of adjacentTiles(tileAt(index))) {
      const neighbour = tileIndex(tile);
      if (distance[neighbour]! <= next) continue;
      distance[neighbour] = next; queue.push(neighbour);
    }
  }
  return distance.map(value => value <= range);
}

function validateAccess(walkable: readonly boolean[], repairRange: number): void {
  if (walkable.length !== 2500 || !Array.from(walkable).every(value => typeof value === 'boolean')) {
    throw new Error('Invalid defense walkability');
  }
  if (!Number.isSafeInteger(repairRange) || repairRange < 0 || repairRange > 49) throw new Error('Invalid repair range');
}
