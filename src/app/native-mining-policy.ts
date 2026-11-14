import type { MiningStation } from '../capabilities/mining/station';
import type { BodyPart } from '../capabilities/spawning/body';
import { miningOwner } from '../features/mining/demand';
import { observeMiningPopulation, nativeHarvestRate, plannedHarvestRate } from '../adapters/screeps/mining-rates';
export function miningPopulationFor(room: string, stations: readonly MiningStation[]) {
  const kinds = new Map(stations.map(station => [miningOwner(station), station.kind]));
  return observeMiningPopulation('energy').filter(unit => unit.room === room && unit.owner.startsWith('mining:'))
    .map(unit => ({ ...unit, rate: nativeHarvestRate(Game.creeps[unit.name]!.body, kinds.get(unit.owner) ?? 'energy') }));
}
export function configureMineralStation(station: MiningStation, body: readonly BodyPart[] | undefined, enabled: boolean): MiningStation {
  if (station.kind === 'energy') return station;
  const extractor = station.extractor ? Game.getObjectById(station.extractor as Id<StructureExtractor>) : null;
  const ready = enabled && !!body && !!station.container && !!extractor?.isActive();
  return { ...station, access: station.access.slice(0, 1),
    throughput: ready ? plannedHarvestRate(body!, 'mineral') : 0 };
}
