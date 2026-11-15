import type { CollectionSource } from '../../capabilities/resources/collection';
import type { Position } from '../../capabilities/movement/step';
import type { MiningStation } from '../../capabilities/mining/station';
import { defaultWorkerEnergyPolicy, selectWorkerEnergy } from './energy-selection';
/** Follow the assigned station's observed deposit infrastructure, never a miner's mutable role memory. */
export function selectMinerEnergy(sources: readonly CollectionSource[], position: Position, free: number,
  station: MiningStation, storageReserve: number) {
  const endpoints = [station.link, station.container, station.storage];
  return selectWorkerEnergy(sources, position, free, { ...defaultWorkerEnergyPolicy, storageReserve },
    (source, distance) => {
      if (source.kind === 'drop') return { priority: distance <= 1 ? 0 : 4, score: distance };
      const index = endpoints.indexOf(source.id);
      return { priority: index < 0 ? Infinity : index + 1, score: distance };
    });
}
