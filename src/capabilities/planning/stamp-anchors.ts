import { tilesByDistance } from '../../core/geometry/distance-order';
import { anchorForPlacement } from '../../core/geometry/transforms';
import type { TransformIndex } from '../../core/geometry/transforms';
import { insideRoom, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { LayoutStamp } from './stamp-placement';
import type { AssessmentInput } from './assessment-model';
/** Preservation-derived anchors first, then distance from the selected hub; geometry admission is separate. */
export function stampAnchors(
  stamp: LayoutStamp, center: Tile, observation: AssessmentInput, limit: number,
): Tile[] {
  if (!insideRoom(center) || !Number.isSafeInteger(limit) || limit < 1 || limit > 2500) throw new Error('Invalid stamp anchor policy');
  const preferred = preservedAnchors(stamp, observation);
  const compare = (a: Tile, b: Tile) => range(center, a) - range(center, b) || tileIndex(a) - tileIndex(b);
  const anchors = [...preferred.values()].sort(compare).slice(0, limit);
  for (const tile of tilesByDistance(center)) {
    if (anchors.length >= limit) break;
    if (!preferred.has(tileIndex(tile))) anchors.push(tile);
  }
  return anchors;
}
function range(a: Tile, b: Tile): number { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }

function preservedAnchors(stamp: LayoutStamp, observation: AssessmentInput): Map<number, Tile> {
  const preferred = new Map<number, Tile>();
  const structures = observation.infrastructure.filter(entry => entry.owned)
    .map(entry => ({ type: entry.type, position: entry.position }));
  for (const constraint of observation.constraints) {
    if (constraint.kind === 'locked' && constraint.type) structures.push({ type: constraint.type, position: constraint.position });
  }
  for (const structure of structures) {
    for (const cell of stamp.tiles.filter(tile => tile.type === structure.type && !['road', 'rampart'].includes(tile.type))) {
      for (let transform = 0; transform < 8; transform++) {
        const anchor = anchorForPlacement(structure.position, cell.offset, transform as TransformIndex);
        if (anchor && insideRoom(anchor, 2)) preferred.set(tileIndex(anchor), anchor);
      }
    }
  }
  return preferred;
}
