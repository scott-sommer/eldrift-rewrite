import { createIntentAdmission } from '../../persistence/intent-admission';
import type { StatePort } from '../../persistence/versioned-state';
import type { SpawnAssignment, SpawnRequest } from '../../capabilities/spawning/request';
import { createNativeSpawn } from './spawn';

/** One durable admission boundary for spawn production, renewal and body-changing lab intents. */
export function createNativeStructureActions(state: StatePort, memory: (request: SpawnRequest) => CreepMemory) {
  const admission = createIntentAdmission(state, () => Game.time);
  const spawn = createNativeSpawn(memory);
  const structureKey = (id: string) => 'structure:' + id;
  const bodyKey = (id: string) => 'body:' + id;
  function energy(room: Room, amount: number) {
    return { pool: room.name, amount, available: room.energyAvailable };
  }
  return {
    availableSpawn: (id: string) => !admission.used(structureKey(id)),
    availableEnergy: (room: string, available: number) => admission.remaining(room, available),
    spawn(assignment: SpawnAssignment): number {
      const target = Game.getObjectById(assignment.spawn as Id<StructureSpawn>);
      if (!target?.my || target.room.name !== assignment.request.room) return ERR_INVALID_TARGET;
      const cost = assignment.request.body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
      if (!admission.admit(assignment.request.owner, [structureKey(target.id)], energy(target.room, cost))) return ERR_BUSY;
      return spawn(assignment);
    },
    renew(spawn: StructureSpawn, creep: Creep, owner: string): number {
      if (!spawn.my || !creep.my) return ERR_NOT_OWNER;
      if (spawn.room.name !== creep.room.name || !creep.body.length) return ERR_INVALID_TARGET;
      const cost = Math.ceil(1.2 * creep.body.reduce((sum, part) => sum + BODYPART_COST[part.type], 0)
        / CREEP_SPAWN_TIME / creep.body.length);
      if (!admission.admit(owner, [structureKey(spawn.id), bodyKey(creep.id)], energy(spawn.room, cost))) return ERR_BUSY;
      return spawn.renewCreep(creep);
    },
    observe(observer: StructureObserver, room: string, owner: string): number {
      if (!observer.my) return ERR_NOT_OWNER;
      if (!admission.admit(owner, [structureKey(observer.id)])) return ERR_BUSY;
      return observer.observeRoom(room);
    },
    boost(lab: StructureLab, creep: Creep, owner: string): number {
      if (!lab.my || !creep.my) return ERR_NOT_OWNER;
      if (lab.room.name !== creep.room.name) return ERR_INVALID_TARGET;
      if (!admission.admit(owner, [structureKey(lab.id), bodyKey(creep.id)])) return ERR_BUSY;
      return lab.boostCreep(creep);
    },
  };
}
