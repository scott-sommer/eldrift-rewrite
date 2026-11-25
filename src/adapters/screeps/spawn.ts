import type { NativeSpawnEnergyStructure } from './spawn-energy';
import { nativeSpawnDirections } from './spawn-placement';
import type { SpawnAssignment, SpawnRequest } from '../../capabilities/spawning/request';
/** Role-owned memory construction is injected, never mixed into body sizing. */
export function createNativeSpawn(memory: (request: SpawnRequest) => CreepMemory, energyOrder?: (spawn: StructureSpawn) => readonly NativeSpawnEnergyStructure[] | null) {
  return (assignment: SpawnAssignment): number => {
    const spawn = Game.getObjectById(assignment.spawn as Id<StructureSpawn>);
    if (!spawn || !spawn.my || spawn.room.name !== assignment.request.room) return ERR_INVALID_TARGET;
    const directions = nativeSpawnDirections(spawn,assignment.request);
    if (directions === null) return ERR_INVALID_TARGET;
    const energyStructures = energyOrder?.(spawn);
    if (energyStructures === null) return ERR_INVALID_TARGET;
    return spawn.spawnCreep([...assignment.request.body], assignment.request.name, { memory: memory(assignment.request),...(energyStructures ? { energyStructures: [...energyStructures] } : {}),...(directions ? { directions } : {}) });
  };
}
