import type { MiningStation } from '../capabilities/mining/station';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import type { RuntimeConfig } from '../config/model';
import { miningOwner } from '../features/mining/demand';
import { nativeHarvestRate } from '../adapters/screeps/mining-rates';
import { movementPosition } from '../adapters/screeps/movement-traffic';
/** Observe only production with a viable transport destination; mineral links never replace mineral hauling. */
export function observeCourierEndpoints(room: Room, stations: readonly MiningStation[], pending: readonly LogisticsRequest[],
  spawns: readonly StructureSpawn[], config: Readonly<RuntimeConfig>) {
  return stations.filter(station => eligible(station, config)).flatMap(station => {
    const source = Game.getObjectById(station.container as Id<StructureContainer>);
    const request = pending.find(item => item.source === station.container && item.resource === station.resource);
    const requestedSink = request ? Game.getObjectById(request.sink as Id<Structure | Creep>) : null;
    const sink = requestedSink ?? (station.kind === 'energy' ? spawns[0] : mineralDestination(room, config));
    const production = Math.min(station.throughput, Object.values(Game.creeps)
      .filter(creep => !creep.spawning && creep.memory.population?.owner === miningOwner(station))
      .reduce((sum, creep) => sum + nativeHarvestRate(creep.body, station.kind), 0));
    return source && sink && production > 0 ? [{ station, production, source: movementPosition(source.pos), sink: movementPosition(sink.pos) }] : [];
  });
}
function eligible(station: MiningStation, config: Readonly<RuntimeConfig>): boolean {
  if (station.risk !== 'safe' || !station.container) return false;
  if (station.kind === 'energy') return !station.link;
  if (!config.mineralTransportEnabled || station.available <= 0 || !station.extractor) return false;
  return Game.getObjectById(station.extractor as Id<StructureExtractor>)?.isActive() ?? false;
}
function mineralDestination(room: Room, config: Readonly<RuntimeConfig>) {
  if (room.terminal?.my && room.terminal.store.getFreeCapacity() > config.terminalFreeReserve) return room.terminal;
  if (room.storage?.my && room.storage.store.getFreeCapacity() > config.storageFreeReserve) return room.storage;
  return undefined;
}
