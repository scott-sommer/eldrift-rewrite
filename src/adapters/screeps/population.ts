import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
declare global {
  interface CreepMemory { population?: { owner: string; home: string } }
}
export function populationMemory(request: SpawnRequest): CreepMemory {
  return { population: { owner: request.owner, home: request.room } };
}
/** Home is the demand scope, not the current room during remote work. */
export function observePopulation(): PopulationUnit[] {
  const units: PopulationUnit[] = [];
  for (const creep of Object.values(Game.creeps)) {
    const identity = creep.memory.population;
    if (!identity || typeof identity.owner !== 'string' || typeof identity.home !== 'string') continue;
    units.push({ name: creep.name, owner: identity.owner, room: identity.home,
      spawning: creep.spawning, ticksToLive: creep.ticksToLive ?? 0 });
  }
  return units;
}
export function observeSpawning() {
  const rooms = Object.values(Game.rooms).filter(room => room.controller?.my).map(room => room.name);
  return {
    rooms, energy: Object.fromEntries(rooms.map(room => [room, Game.rooms[room]!.energyAvailable])),
    names: new Set(Object.keys(Game.creeps)),
    slots: Object.values(Game.spawns).map(spawn => ({ id: spawn.id, room: spawn.room.name, busy: spawn.spawning !== null })),
  };
}
