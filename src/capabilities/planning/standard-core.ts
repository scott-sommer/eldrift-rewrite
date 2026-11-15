import { placeTemplate } from './template';
import { standardTemplate } from './standard-template';
import { stagePositions } from './staging';
import type { PlacedTile } from './template';
import type { Tile } from '../../core/geometry/local-grid';
import type { TransformIndex } from '../../core/geometry/transforms';
export interface CorePlacement extends PlacedTile {
  rcl: number;
  priority: number;
  tag: 'core' | 'storage';
}
export type StructureLimits = Readonly<Record<string, readonly number[]>>;
interface Recipe { type: string; minimum: number; priority: number; tag: 'core' | 'storage' }
const recipes: readonly Recipe[] = [
  { type: 'storage', minimum: 4, priority: -500, tag: 'core' },
  { type: 'spawn', minimum: 1, priority: -430, tag: 'core' },
  { type: 'extension', minimum: 2, priority: -400, tag: 'core' },
  { type: 'tower', minimum: 3, priority: -340, tag: 'core' },
  { type: 'lab', minimum: 6, priority: -300, tag: 'core' },
  { type: 'terminal', minimum: 6, priority: -320, tag: 'core' },
  { type: 'link', minimum: 5, priority: -365, tag: 'storage' },
  { type: 'powerSpawn', minimum: 8, priority: -240, tag: 'core' },
  { type: 'nuker', minimum: 8, priority: -220, tag: 'core' },
  { type: 'observer', minimum: 8, priority: -210, tag: 'core' },
  { type: 'road', minimum: 4, priority: -220, tag: 'core' },
];
/** Legacy core staging only; logistics attachments and hard validation are separate. */
export function stageStandardCore(
  anchor: Tile, transform: TransformIndex, limits: StructureLimits,
): CorePlacement[] | undefined {
  const placed = placeTemplate(standardTemplate, anchor, transform);
  if (!placed) return undefined;
  return recipes.flatMap(recipe => stageType(placed, anchor, recipe, limits));
}
function stageType(
  placed: readonly PlacedTile[], anchor: Tile, recipe: Recipe, limits: StructureLimits,
): CorePlacement[] {
  const capacity = limits[recipe.type];
  if (!capacity) throw new Error('Missing structure limits: ' + recipe.type);
  const positions = placed.filter(entry => entry.type === recipe.type).map(entry => entry.position);
  return stagePositions(positions, anchor, capacity, recipe.minimum).map(entry => ({
    type: recipe.type, position: entry.position, rcl: entry.rcl,
    priority: recipe.priority, tag: recipe.tag,
  }));
}
