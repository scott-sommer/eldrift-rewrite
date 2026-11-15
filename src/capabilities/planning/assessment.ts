import { adjacentTiles, insideRoom, tileAt, tileIndex } from '../../core/geometry/local-grid';
import { assessTerrain } from './terrain';
import { clearanceMap, connectedRegions } from './grid-analysis';
import type { AssessmentInput, FixedObject } from './assessment-model';
/** Conservative empty-footprint assessment; overlap legality belongs to structure-specific validation. */
export function assessRoom(input: AssessmentInput) {
  validateInput(input);
  const terrain = assessTerrain(input.terrain, input.costs, input.margin);
  const walkable = [...terrain.passable], available = [...terrain.buildable];
  for (const object of input.objects) {
    const index = tileIndex(object.position);
    walkable[index] = false; available[index] = false;
  }
  for (const structure of input.infrastructure) {
    const index = tileIndex(structure.position);
    walkable[index] = walkable[index]! && structure.walkable; available[index] = false;
  }
  for (const constraint of input.constraints) {
    const index = tileIndex(constraint.position);
    available[index] = false;
    if (constraint.kind === 'blocked') walkable[index] = false;
  }
  return { terrain, walkable, available, regions: connectedRegions(available), clearance: clearanceMap(available),
    access: [...input.objects].sort((a, b) => a.id.localeCompare(b.id)).map(object => objectAccess(object, walkable)),
    anchors: input.infrastructure.filter(item => item.owned && ['spawn', 'storage', 'terminal'].includes(item.type))
      .map(item => ({ ...item, position: { ...item.position } })).sort((a, b) => a.id.localeCompare(b.id)),
    constraints: input.constraints.map(item => ({ ...item, position: { ...item.position } }))
      .sort((a, b) => a.id.localeCompare(b.id)) };
}
function objectAccess(object: FixedObject, walkable: readonly boolean[]) {
  const adjacent = adjacentTiles(object.position).map(tileIndex).filter(index => walkable[index]);
  const range = object.kind === 'controller' ? 3 : 1;
  const work = walkable.flatMap((free, index) => {
    const point = tileAt(index);
    return free && Math.max(Math.abs(point.x - object.position.x), Math.abs(point.y - object.position.y)) <= range ? [index] : [];
  });
  return { id: object.id, kind: object.kind, position: { ...object.position }, adjacent, work };
}
function validateInput(input: AssessmentInput): void {
  for (const entries of [input.objects, input.infrastructure, input.constraints]) {
    if (entries.length > 10000 || new Set(entries.map(item => item.id)).size !== entries.length) throw new Error('Duplicate or excessive assessment entries');
    if (!entries.every(item => typeof item.id === 'string' && item.id.length > 0 && insideRoom(item.position))) throw new Error('Invalid assessment entry');
  }
  if (!input.objects.every(item => ['source', 'controller', 'mineral'].includes(item.kind))) throw new Error('Invalid fixed object');
  if (!input.infrastructure.every(item => typeof item.walkable === 'boolean' && typeof item.owned === 'boolean' && item.type.length > 0)) throw new Error('Invalid infrastructure');
  if (!input.constraints.every(validConstraint)) throw new Error('Invalid planning constraint');
}
function validConstraint(item: AssessmentInput['constraints'][number]): boolean {
  if (!['keep-clear', 'blocked', 'locked'].includes(item.kind)) return false;
  return item.kind !== 'locked' || typeof item.type === 'string' && item.type.length > 0;
}
