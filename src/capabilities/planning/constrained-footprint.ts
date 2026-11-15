import { insideRoom } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { TransformIndex } from '../../core/geometry/transforms';
import { constrainedTemplate } from './constrained-template';
import { placeTemplate } from './template';
export function constrainedFootprint(anchor: Tile, transform: TransformIndex) {
  if (!insideRoom(anchor, 3)) return undefined;
  const placed = placeTemplate(constrainedTemplate, anchor, transform, 1);
  if (!placed || placed.some(entry => ['terminal', 'link'].includes(entry.type) && !insideRoom(entry.position, 2))) return undefined;
  return placed;
}
