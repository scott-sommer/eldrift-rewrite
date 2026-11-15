import { adjacentTiles, tileAt } from '../../core/geometry/local-grid';
import { layoutConnectivity } from './connectivity';
import type { AccessRequirement, ConnectivityResult } from './connectivity';
import type { assessRoom } from './assessment';
import type { PlacedTile } from './template';
export interface StagedTile extends PlacedTile { rcl: number }
export interface StageAccessResult extends ConnectivityResult { rcl: number }
type Assessment = ReturnType<typeof assessRoom>;
const unserviced = new Set(['road', 'rampart', 'constructedWall']);
/** Assess every construction stage; fixed objects remain reachable even before extraction unlocks. */
export function validateStageAccess(
  assessment: Assessment, placements: readonly StagedTile[], blocksMovement: (type: string) => boolean,
): StageAccessResult[] {
  return Array.from({ length: 8 }, (_, index) => {
    const rcl = index + 1;
    const active = placements.filter(entry => entry.rcl <= rcl);
    const requirements = accessRequirements(assessment, active);
    return { rcl, ...layoutConnectivity(assessment.walkable, active, blocksMovement, requirements) };
  });
}
export function accessRequirements(assessment: Assessment, placements: readonly PlacedTile[]): AccessRequirement[] {
  const objects = assessment.access.map(object => ({
    id: object.kind + ':' + object.id, positions: object.work.map(tileAt),
  }));
  const services = placements.filter(entry => !unserviced.has(entry.type)).map(entry => ({
    id: entry.type + ':' + entry.position.x + ':' + entry.position.y,
    positions: adjacentTiles(entry.position),
  }));
  const exits = assessment.terrain.exits.map((exit, index) => ({
    id: 'exit:' + exit.side + ':' + index, positions: exit.tiles.map(tileAt),
  }));
  return [...objects, ...services, ...exits];
}
