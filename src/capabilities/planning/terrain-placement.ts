import { adjacentTiles, insideRoom, tileIndex } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
import type { AssessmentInput } from './assessment-model';
export type TerrainPlacementFailure = 'border' | 'exit-adjacency' | 'wall' | 'fixed-object' | 'missing-mineral';
/** Static terrain/object eligibility; ownership, sharing and build sequencing are separate gates. */
export function terrainPlacementFailure(
  entry: PlacedTile, input: Pick<AssessmentInput, 'terrain' | 'objects'>,
): TerrainPlacementFailure | undefined {
  if (!insideRoom(entry.position, 1)) return 'border';
  const index = tileIndex(entry.position);
  if (entry.type !== 'road' && entry.type !== 'container' && touchesExit(entry, input.terrain)) return 'exit-adjacency';
  const objects = input.objects.filter(object => tileIndex(object.position) === index);
  if (entry.type === 'extractor') {
    return objects.some(object => object.kind === 'mineral') ? undefined : 'missing-mineral';
  }
  if (objects.length) return 'fixed-object';
  if (entry.type !== 'road' && input.terrain[index] === 'wall') return 'wall';
  return undefined;
}
function touchesExit(entry: PlacedTile, terrain: AssessmentInput['terrain']): boolean {
  return adjacentTiles(entry.position).some(tile => !insideRoom(tile, 1) && terrain[tileIndex(tile)] !== 'wall');
}
