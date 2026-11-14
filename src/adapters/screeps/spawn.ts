import type { SpawnAssignment, SpawnRequest } from '../../capabilities/spawning/request';
/** Role-owned memory construction is injected, never mixed into body sizing. */
export function createNativeSpawn(memory: (request: SpawnRequest) => CreepMemory) {
  return (assignment: SpawnAssignment): number => {
    const spawn = Game.getObjectById(assignment.spawn as Id<StructureSpawn>);
    if (!spawn || !spawn.my || spawn.room.name !== assignment.request.room) return ERR_INVALID_TARGET;
    return spawn.spawnCreep([...assignment.request.body], assignment.request.name, { memory: memory(assignment.request) });
  };
}
