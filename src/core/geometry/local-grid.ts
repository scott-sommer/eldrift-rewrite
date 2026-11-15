export interface Tile { x: number; y: number }
export const roomSize = 50;
export function validOffset(point: Tile): boolean {
  return Number.isSafeInteger(point.x) && Number.isSafeInteger(point.y);
}
export function insideRoom(point: Tile, margin = 0): boolean {
  if (!Number.isInteger(margin) || margin < 0 || margin > 24) throw new Error('Invalid room margin');
  return validOffset(point) && point.x >= margin && point.y >= margin
    && point.x < roomSize - margin && point.y < roomSize - margin;
}
export function tileIndex(point: Tile): number {
  if (!insideRoom(point)) throw new Error('Invalid room tile');
  return point.y * roomSize + point.x;
}
export function tileAt(index: number): Tile {
  if (!Number.isInteger(index) || index < 0 || index >= roomSize * roomSize) throw new Error('Invalid tile index');
  return { x: index % roomSize, y: Math.floor(index / roomSize) };
}
/** Deterministic row-major eight-neighbour adjacency, clipped without room wrapping. */
export function adjacentTiles(point: Tile): Tile[] {
  if (!insideRoom(point)) throw new Error('Invalid room tile');
  const result: Tile[] = [];
  for (let y = Math.max(0, point.y - 1); y <= Math.min(49, point.y + 1); y++) {
    for (let x = Math.max(0, point.x - 1); x <= Math.min(49, point.x + 1); x++) {
      if (x !== point.x || y !== point.y) result.push({ x, y });
    }
  }
  return result;
}
