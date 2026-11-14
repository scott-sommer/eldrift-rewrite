import type { CollectionSource, CollectionOrder } from '../../capabilities/resources/collection';
import type { Position } from '../../capabilities/movement/step';
import { range } from '../logistics/links/model';
export interface WorkerEnergyPolicy {
  storageReserve: number;
  nearbyDropMinimum: number;
  nearbyDropRange: number;
  linkMinimum: number;
  linkRange: number;
}
export const defaultWorkerEnergyPolicy: Readonly<WorkerEnergyPolicy> = Object.freeze({
  storageReserve: 50000, nearbyDropMinimum: 20, nearbyDropRange: 3, linkMinimum: 1, linkRange: 50,
});
/** Policy chooses sources; execution owns reservations and intent outcomes. */
export function selectWorkerEnergy(sources: readonly CollectionSource[], position: Position, free: number,
  policy: WorkerEnergyPolicy = defaultWorkerEnergyPolicy): CollectionOrder | undefined {
  if (!Object.values(policy).every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid worker energy policy');
  if (!Number.isSafeInteger(free) || free < 0) throw new Error('Invalid collection capacity');
  const candidates = sources.filter(source => source.position.room === position.room).flatMap(source => {
    const reserve = source.kind === 'storage' ? policy.storageReserve : 0;
    const amount = Math.min(free, Math.max(0, source.available - reserve));
    if (amount <= 0 || source.kind === 'drop' && amount < Math.min(source.stock, free)) return [];
    const distance = range(position, source.position);
    const priority = sourcePriority(source, distance, policy);
    return Number.isFinite(priority) ? [{ source, amount, reserve, priority, distance }] : [];
  });
  candidates.sort((a, b) => a.priority - b.priority || a.distance - b.distance || a.source.id.localeCompare(b.source.id));
  const best = candidates[0];
  return best ? { source: best.source, amount: best.amount, reserve: best.reserve } : undefined;
}
function sourcePriority(source: CollectionSource, distance: number, policy: WorkerEnergyPolicy): number {
  if (source.kind === 'drop') return distance <= policy.nearbyDropRange && source.stock > policy.nearbyDropMinimum ? 0 : 5;
  if (source.kind === 'link') return source.controllerLink && source.available >= policy.linkMinimum && distance <= policy.linkRange ? 1 : Infinity;
  return { storage: 2, container: 3, remains: 4, terminal: 6 }[source.kind];
}
