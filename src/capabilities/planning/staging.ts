import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
export interface StagedPosition { position: Tile; rcl: number }
export function validateLimits(limits: readonly number[]): void {
  if (limits.length !== 9) throw new Error('Expected RCL zero through eight limits');
  let previous = 0;
  for (const limit of limits) {
    if (!Number.isSafeInteger(limit) || limit < previous) throw new Error('Invalid structure limits');
    previous = limit;
  }
}
function range(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
/** Legacy progressive distance/key ordering; injected engine limits, no game globals. */
export function stagePositions(
  positions: readonly Tile[], storage: Tile, limits: readonly number[], minimumLevel: number,
): StagedPosition[] {
  validateLimits(limits);
  tileIndex(storage);
  if (!Number.isInteger(minimumLevel) || minimumLevel < 1 || minimumLevel > 8) throw new Error('Invalid minimum RCL');
  const keys = positions.map(tileIndex);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate staged position');
  if (positions.length > limits[8]!) throw new Error('Structure capacity exceeded');
  const sorted = [...positions].sort((a, b) => range(storage, a) - range(storage, b)
    || (a.x + ':' + a.y).localeCompare(b.x + ':' + b.y));
  let level = minimumLevel;
  return sorted.map((position, index) => {
    while (limits[level]! <= index) level++;
    return { position: { ...position }, rcl: level };
  });
}
