import { insideRoom, tileAt, tileIndex } from '../../core/geometry/local-grid';
import { clearanceMap, connectedRegions } from './grid-analysis';
export type TerrainCell = 'plain' | 'swamp' | 'wall';
export type ExitSide = 'top' | 'right' | 'bottom' | 'left';
export interface ExitGroup { side: ExitSide; tiles: number[] }
export interface TerrainCosts { plain: number; swamp: number }
export function assessTerrain(terrain: readonly TerrainCell[], costs: TerrainCosts = { plain: 1, swamp: 5 }, margin = 2) {
  validateTerrain(terrain);
  if (![costs.plain, costs.swamp].every(value => Number.isSafeInteger(value) && value > 0 && value < 255)) throw new Error('Invalid terrain costs');
  insideRoom({ x: 25, y: 25 }, margin);
  const passable = terrain.map(cell => cell !== 'wall');
  const buildable = passable.map((free, index) => free && insideRoom(tileAt(index), margin));
  return { costs: terrain.map(cell => cell === 'wall' ? 255 : costs[cell]),
    passable, buildable, regions: connectedRegions(buildable), clearance: clearanceMap(buildable),
    exits: groupExits(passable), counts: {
      plain: terrain.filter(cell => cell === 'plain').length,
      swamp: terrain.filter(cell => cell === 'swamp').length,
      wall: terrain.filter(cell => cell === 'wall').length,
    } };
}
export function validateTerrain(terrain: readonly TerrainCell[]): void {
  if (terrain.length !== 2500 || !Array.from(terrain).every(cell => ['plain', 'swamp', 'wall'].includes(cell))) throw new Error('Invalid terrain');
}
function groupExits(passable: readonly boolean[]): ExitGroup[] {
  const groups: ExitGroup[] = [];
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    let current: ExitGroup | undefined;
    for (let offset = 0; offset < 50; offset++) {
      const index = edgeIndex(side, offset);
      if (!passable[index]) { current = undefined; continue; }
      if (!current) { current = { side, tiles: [] }; groups.push(current); }
      current.tiles.push(index);
    }
  }
  return groups;
}
function edgeIndex(side: ExitSide, offset: number): number {
  const positions = { top: { x: offset, y: 0 }, right: { x: 49, y: offset },
    bottom: { x: offset, y: 49 }, left: { x: 0, y: offset } };
  return tileIndex(positions[side]);
}
