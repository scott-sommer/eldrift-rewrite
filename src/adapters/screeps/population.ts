import type {} from './spawn-exits';
import { copySpawnBoost, spawnBoostIdentity } from '../../capabilities/spawning/boost';
import type { BoostRequest } from '../../capabilities/industry/boosts/model';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
declare global {
  interface CreepMemory { industryBoostBirth?: Omit<BoostRequest,'unit' | 'name'>; population?: { owner: string; home: string } }
}
export function populationMemory(request: SpawnRequest): CreepMemory {
  const home = request.home ?? request.room;
  const memory: CreepMemory = { population: { owner: request.owner,home },...(request.placement ? { birthPlacement: { spawn: request.placement.spawn,exit: { ...request.placement.exit } } } : {}) };
  if (!request.boost) return memory;
  const expiresAt = Game.time+request.body.length*CREEP_SPAWN_TIME+request.boost.timeout;
  if (!Number.isSafeInteger(expiresAt) || expiresAt >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid birth boost deadline');
  const boost = copySpawnBoost(request.boost);
  return { ...memory,industryBoostBirth: {
    id: spawnBoostIdentity(request),owner: request.owner,home,steps: boost.steps,required: boost.required,expiresAt,
  } };
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
