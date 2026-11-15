import { copyPlain } from '../../persistence/plain-data';
import type { StagedTile } from '../../capabilities/planning/template';
import type { PlanEntry } from './plan-model';
import type { ProposalPlacement } from './plan-proposal';
/** Exact manual placements override generated metadata; additions still require all normal validation. */
export function mergeOperatorPlacements(draft: readonly StagedTile[], existing: readonly PlanEntry[]): ProposalPlacement[] {
  const placements = new Map<string, ProposalPlacement>();
  for (const entry of draft) {
    const key = placementKey(entry.type, entry.position.x, entry.position.y);
    if (placements.has(key)) throw new Error('Duplicate draft placement');
    placements.set(key, copyPlain(entry));
  }
  const seen = new Set<string>();
  for (const entry of existing.filter(item => item.source === 'operator')) {
    const key = placementKey(entry.type, entry.x, entry.y);
    if (seen.has(key)) throw new Error('Duplicate operator placement');
    seen.add(key);
    const { x, y, ...metadata } = copyPlain(entry);
    placements.set(key, { ...metadata, position: { x, y } });
  }
  return [...placements.values()];
}
function placementKey(type: string, x: number, y: number): string { return type + ':' + x + ':' + y; }
