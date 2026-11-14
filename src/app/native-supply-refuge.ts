import type { RuntimeConfig } from '../config/model';
import { nativeCargoSinks } from './native-cargo-recovery';
/** A refuge must run cargo recovery and have a destination for every resource currently carried. */
export function selectSupplyRefuge(creep: Creep, config: (room: string) => Readonly<RuntimeConfig>): Room | undefined {
  const resources = (Object.keys(creep.store) as ResourceConstant[]).filter(type => creep.store.getUsedCapacity(type) > 0);
  return Object.values(Game.rooms).filter(room => {
    const settings = config(room.name);
    return room.controller?.my && settings.logisticsEnabled
      && resources.every(resource => nativeCargoSinks(room, resource, settings.terminalFreeReserve).length > 0);
  }).sort((a, b) => Game.map.getRoomLinearDistance(creep.room.name, a.name) - Game.map.getRoomLinearDistance(creep.room.name, b.name)
    || a.name.localeCompare(b.name))[0];
}
