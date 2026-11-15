import { adjacentTiles, roomSize, tileAt, tileIndex } from '../../core/geometry/local-grid';
const area = roomSize * roomSize;
function validateMask(mask: readonly boolean[]): void {
  if (mask.length !== area || !Array.from(mask).every(value => typeof value === 'boolean')) throw new Error('Invalid room mask');
}
/** Eight-connected components; each ID is its smallest row-major tile index. */
export function connectedRegions(mask: readonly boolean[]): { id: number; tiles: number[] }[] {
  validateMask(mask);
  const visited = new Set<number>(), regions: { id: number; tiles: number[] }[] = [];
  for (let index = 0; index < area; index++) {
    if (!mask[index] || visited.has(index)) continue;
    const tiles = flood(mask, index, visited);
    regions.push({ id: index, tiles: tiles.sort((a, b) => a - b) });
  }
  return regions;
}
function flood(mask: readonly boolean[], start: number, visited: Set<number>): number[] {
  const queue = [start]; visited.add(start);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const neighbour of adjacentTiles(tileAt(queue[cursor]!))) {
      const index = tileIndex(neighbour);
      if (!mask[index] || visited.has(index)) continue;
      visited.add(index); queue.push(index);
    }
  }
  return queue;
}
/** Chebyshev distance to a blocked tile or outside-room cell. Free square radius is distance-1. */
export function clearanceMap(mask: readonly boolean[]): number[] {
  validateMask(mask);
  const distances = Array<number>(area).fill(Infinity), queue: number[] = [];
  for (let index = 0; index < area; index++) {
    if (!mask[index]) { distances[index] = 0; queue.push(index); }
  }
  seedEdges(mask, distances, queue);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor]!, next = distances[index]! + 1;
    for (const neighbour of adjacentTiles(tileAt(index))) {
      const target = tileIndex(neighbour);
      if (distances[target]! <= next) continue;
      distances[target] = next; queue.push(target);
    }
  }
  return distances;
}
function seedEdges(mask: readonly boolean[], distances: number[], queue: number[]): void {
  for (let index = 0; index < area; index++) {
    const { x, y } = tileAt(index);
    if (!mask[index] || x > 0 && x < 49 && y > 0 && y < 49) continue;
    distances[index] = 1; queue.push(index);
  }
}
