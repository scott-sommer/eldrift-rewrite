export interface RemoteActorBinding { home: string; owner: string }
/** Actor ownership precedes task I/O; roles cannot take over another population owner's unit. */
export function eligibleRemoteActor(creep: Creep, binding: RemoteActorBinding): boolean {
  return creep.my && !creep.spawning && creep.memory.population?.home === binding.home && creep.memory.population.owner === binding.owner;
}
