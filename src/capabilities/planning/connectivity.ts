import { connectedRegions } from './grid-analysis';
import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
export interface AccessRequirement { id: string; positions: readonly Tile[] }
export interface ConnectivityResult {
  connected: boolean;
  commonRegions: number[];
  inaccessible: string[];
}
/** One common component must reach every service/work/egress requirement. */
export function layoutConnectivity(
  walkable: readonly boolean[], placements: readonly PlacedTile[],
  blocksMovement: (type: string) => boolean, requirements: readonly AccessRequirement[],
): ConnectivityResult {
  const mask = [...walkable];
  for (const entry of placements) {
    const index = tileIndex(entry.position);
    if (blocksMovement(entry.type)) mask[index] = false;
  }
  const regions = connectedRegions(mask);
  const regionAt = new Map<number, number>();
  for (const region of regions) for (const tile of region.tiles) regionAt.set(tile, region.id);
  const access = requirements.map(requirement => requirementRegions(requirement, regionAt));
  const inaccessible = requirements.filter((_, index) => access[index]!.size === 0).map(item => item.id);
  const commonRegions = regions.filter(region => access.every(ids => ids.has(region.id))).map(region => region.id);
  return { connected: requirements.length > 0 && commonRegions.length > 0, commonRegions, inaccessible };
}
function requirementRegions(requirement: AccessRequirement, regionAt: ReadonlyMap<number, number>): Set<number> {
  const result = new Set<number>();
  for (const position of requirement.positions) {
    const region = regionAt.get(tileIndex(position));
    if (region !== undefined) result.add(region);
  }
  return result;
}
