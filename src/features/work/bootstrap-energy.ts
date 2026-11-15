import type { CollectionSource } from '../../capabilities/resources/collection';
import type { Position } from '../../capabilities/movement/step';
import { defaultWorkerEnergyPolicy, selectWorkerEnergy } from './energy-selection';
import { range } from '../logistics/links/model';
export function selectBootstrapEnergy(sources: readonly CollectionSource[], position: Position, free: number, capacity: number) {
  return selectWorkerEnergy(sources, position, free, { ...defaultWorkerEnergyPolicy, storageReserve: 0 },
    (source, distance) => ({ priority: priority(source, capacity), score: distance }));
}
function priority(source: CollectionSource, capacity: number): number {
  switch (source.kind) {
    case 'remains': return 0;
    case 'drop': return source.stock > 70 ? 1 : Infinity;
    case 'storage': return 2;
    case 'terminal': return 3;
    case 'container': return source.available > capacity ? 4 : Infinity;
    default: return Infinity;
  }
}
export interface BootstrapSource { id: string; position: Position; energy: number; regeneration: number }
export function selectBootstrapSource(sources: readonly BootstrapSource[], position: Position, assigned?: string): BootstrapSource | undefined {
  const retained = sources.find(source => source.id === assigned && source.position.room === position.room && source.energy > 0);
  if (retained) return retained;
  return [...sources].filter(source => source.position.room === position.room).sort((a, b) =>
    Number(b.energy > 0) - Number(a.energy > 0) ||
    (a.energy > 0 ? 0 : a.regeneration - b.regeneration) ||
    range(a.position, position) - range(b.position, position) || a.id.localeCompare(b.id))[0];
}
