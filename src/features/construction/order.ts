import type { PlanEntry } from '../planning/plan-model';
import { placementKey } from '../planning/dependencies';
import { copyPlain } from '../../persistence/plain-data';
export interface ConstructionOrderPolicy { bootstrapSpawn?: string; types: readonly string[] }
export const constructionTypeOrder: readonly string[] = [
  'container', 'road', 'storage', 'extension', 'tower', 'rampart', 'constructedWall',
  'link', 'spawn', 'terminal', 'extractor', 'lab', 'factory', 'observer', 'powerSpawn', 'nuker',
];
/** Category policy orders work; declared per-entry priority and stable placement keys break ties. */
export function orderConstructionEntries(entries: readonly PlanEntry[], policy: ConstructionOrderPolicy): PlanEntry[] {
  if (new Set(policy.types).size !== policy.types.length || policy.types.some(type => !type)) throw new Error('Invalid construction type order');
  if (policy.bootstrapSpawn && !entries.some(entry => entry.type === 'spawn' && placementKey(entry) === policy.bootstrapSpawn)) {
    throw new Error('Missing construction bootstrap spawn');
  }
  const ranks = new Map(policy.types.map((type, index) => [type, index + 1]));
  const rank = (entry: PlanEntry) => placementKey(entry) === policy.bootstrapSpawn ? 0 : ranks.get(entry.type) ?? ranks.size + 1;
  return copyPlain([...entries].sort((a, b) => rank(a) - rank(b) || a.priority - b.priority || compareKeys(a, b)));
}
function compareKeys(a: PlanEntry, b: PlanEntry): number {
  const first = placementKey(a), second = placementKey(b);
  return first < second ? -1 : Number(first > second);
}
