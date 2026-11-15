import { placeOffset } from '../../core/geometry/transforms';
import type { TransformIndex } from '../../core/geometry/transforms';
import type { Tile } from '../../core/geometry/local-grid';

export interface TemplateTile { type: string; offset: Tile }
export interface PlacedTile { type: string; position: Tile }
export interface StagedTile extends PlacedTile { rcl: number }
/** Atomic placement: an out-of-bounds footprint is rejected, never truncated. */
export function placeTemplate(
  template: readonly TemplateTile[], anchor: Tile, transform: TransformIndex, margin = 2,
): PlacedTile[] | undefined {
  const result: PlacedTile[] = [];
  for (const entry of template) {
    const position = placeOffset(anchor, entry.offset, transform, margin);
    if (!position) return undefined;
    result.push({ type: entry.type, position });
  }
  return result;
}
