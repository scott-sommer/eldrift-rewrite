import { tileIndex } from '../../core/geometry/local-grid';
import { terrainPlacementFailure } from './terrain-placement';
import type { AssessmentInput } from './assessment-model';
import type { PlacedTile } from './template';
/** Final occupancy policy from pinned engine sharing rules; duplicate entries are rejected elsewhere. */
export function canShareTile(first: string, second: string): boolean {
  return first !== second && [first, second].some(type => type === 'road' || type === 'rampart');
}
/** Retains observed infrastructure; demolition/migration must be explicitly modeled before removal. */
export function placementFailures(entries: readonly PlacedTile[], input: AssessmentInput): string[] {
  const failures: string[] = [];
  const planned = new Map<number, string[]>();
  for (const entry of entries) {
    const key = entry.type + ':' + entry.position.x + ':' + entry.position.y;
    const terrain = terrainPlacementFailure(entry, input);
    if (terrain) failures.push(key + ':' + terrain);
    const index = tileIndex(entry.position);
    const neighbours = planned.get(index) ?? [];
    if (neighbours.some(type => !canShareTile(type, entry.type))) failures.push(key + ':planned-conflict');
    neighbours.push(entry.type);
    planned.set(index, neighbours);
    if (input.infrastructure.some(existing => tileIndex(existing.position) === index
      && existing.type !== entry.type && !canShareTile(existing.type, entry.type))) {
      failures.push(key + ':existing-conflict');
    }
  }
  return failures.sort();
}
