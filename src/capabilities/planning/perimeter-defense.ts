import { adjacentTiles, insideRoom, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { TerrainCell } from './terrain';
import type { StagedTile } from './template';
export interface DefenseBounds { minX: number; maxX: number; minY: number; maxY: number }
export interface PerimeterDefenseInput {
  bounds: DefenseBounds; terrain: readonly TerrainCell[]; controller?: Tile;
  padding?: number; rcl?: number;
}
/** Legacy perimeterWithController geometry; callers must validate the complete defended draft. */
export function perimeterDefense(input: PerimeterDefenseInput): StagedTile[] {
  validateInput(input);
  const padding = input.padding ?? 4, rcl = input.rcl ?? 6;
  const bounds = { minX: Math.max(2, input.bounds.minX - padding), maxX: Math.min(47, input.bounds.maxX + padding),
    minY: Math.max(2, input.bounds.minY - padding), maxY: Math.min(47, input.bounds.maxY + padding) };
  const seen = new Set<number>(), entries: StagedTile[] = [];
  const add = (position: Tile, tag: string, priority: number) => {
    const index = tileIndex(position);
    if (input.terrain[index] === 'wall' || seen.has(index)) return;
    seen.add(index); entries.push({ type: 'rampart', position, tag, priority, rcl });
  };
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    add({ x, y: bounds.minY }, 'perimeter', 50); add({ x, y: bounds.maxY }, 'perimeter', 50);
  }
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    add({ x: bounds.minX, y }, 'perimeter', 50); add({ x: bounds.maxX, y }, 'perimeter', 50);
  }
  if (input.controller) {
    const neighbours = adjacentTiles(input.controller).filter(tile => insideRoom(tile, 1))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    for (const tile of neighbours) add(tile, 'controller', 40);
  }
  return entries;
}
function validateInput({ bounds, terrain, padding = 4, rcl = 6 }: PerimeterDefenseInput): void {
  const { minX, maxX, minY, maxY } = bounds;
  if (!Object.values(bounds).every(value => integer(value, 2, 47))
    || minX > maxX || minY > maxY) throw new Error('Invalid defense bounds');
  if (terrain.length !== 2500 || !terrain.every(cell => ['plain', 'swamp', 'wall'].includes(cell))) throw new Error('Invalid defense terrain');
  if (!integer(padding, 0, 45)) throw new Error('Invalid defense padding');
  if (!integer(rcl, 2, 8)) throw new Error('Invalid defense RCL');
}
function integer(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
