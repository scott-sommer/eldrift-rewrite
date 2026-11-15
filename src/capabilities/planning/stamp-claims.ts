import { tileIndex } from '../../core/geometry/local-grid';
import type { StagedTile } from './template';
/** Existing/manual cells may satisfy one stamp; later stamps cannot count that capacity again. */
export function claimStampTiles(tiles: readonly StagedTile[], previous: readonly string[]): string[] | undefined {
  const claimed = new Set(previous);
  if (claimed.size !== previous.length) throw new Error('Duplicate stamp claim');
  const added: string[] = [];
  for (const tile of tiles) {
    if (tile.type === 'road' || tile.type === 'rampart') continue;
    const key = tile.type + ':' + tileIndex(tile.position);
    if (claimed.has(key)) return undefined;
    added.push(key);
  }
  return [...previous, ...added];
}
