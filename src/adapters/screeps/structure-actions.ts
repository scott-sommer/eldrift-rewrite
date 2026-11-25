import type { NativeSpawnEnergyAdmission } from './spawn-energy-admission';
import { nativeSpawnDirections } from './spawn-placement';
import { createIntentAdmission } from '../../persistence/intent-admission';
import type { StatePort } from '../../persistence/versioned-state';
import type { SpawnAssignment, SpawnRequest } from '../../capabilities/spawning/request';
import { createNativeSpawn } from './spawn';

/** One durable admission boundary for spawn production, renewal and body-changing lab intents. */
export function createNativeStructureActions(state: StatePort, memory: (request: SpawnRequest) => CreepMemory, physicalEnergy?: NativeSpawnEnergyAdmission) {
  const admission = createIntentAdmission(state, () => Game.time);
  const structureKey = (id: string) => 'structure:' + id;
  const bodyKey = (id: string) => 'body:' + id;
  function allowed(identity: string,owner: string): boolean {
    const held = admission.owner(identity); return held === null || held === owner;
  }
  function hold(identity: string,action: string,owner: string): boolean {
    const held = admission.owner(identity);
    if (held !== null) return held === owner;
    return !admission.used(action) && admission.admit(owner,[identity]);
  }
  function energy(room: Room, amount: number) {
    return { pool: room.name, amount, available: room.energyAvailable };
  }
  function prepareSpawn(assignment: SpawnAssignment) {
    const target = Game.getObjectById(assignment.spawn as Id<StructureSpawn>);
    if (!target?.my || target.room.name !== assignment.request.room) return ERR_INVALID_TARGET;
    if (nativeSpawnDirections(target,assignment.request) === null) return ERR_INVALID_TARGET;
    const pending = target.room.energyAvailable-admission.remaining(target.room.name,target.room.energyAvailable);
    const plan = physicalEnergy?.(target,assignment.request,pending);
    return plan === null ? ERR_NOT_ENOUGH_ENERGY : { target,plan };
  }
  return {
    holdBody: (creep: Creep,owner: string) => creep.my && hold('body-owner:'+creep.id,bodyKey(creep.id),owner),
    holdLab: (lab: StructureLab,owner: string) => lab.my && hold('lab-owner:'+lab.id,structureKey(lab.id),owner),
    availableSpawn: (id: string) => !admission.used(structureKey(id)),
    availableEnergy: (room: string, available: number) => admission.remaining(room, available),
    preflightSpawn(assignment: SpawnAssignment): number { const prepared = prepareSpawn(assignment); return typeof prepared === 'number' ? prepared : 0; },
    spawn(assignment: SpawnAssignment): number {
      const prepared = prepareSpawn(assignment); if (typeof prepared === 'number') return prepared;
      const { target,plan } = prepared;
      const cost = assignment.request.body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
      if (!admission.admit(assignment.request.owner, [structureKey(target.id)], energy(target.room, cost))) return ERR_BUSY;
      const result = createNativeSpawn(memory,plan ? () => plan.structures : undefined)(assignment);
      if (plan && result === OK) plan.commit();
      return result;
    },
    cancelSpawning(spawn: StructureSpawn, name: string, owner: string): number {
      if (!spawn.my) return ERR_NOT_OWNER;
      if (spawn.spawning?.name !== name) return ERR_INVALID_TARGET;
      const creep = Game.creeps[name];
      if (!creep?.my || creep.memory.population?.owner !== owner || creep.memory.population.home !== spawn.room.name) return ERR_NOT_OWNER;
      if (!creep.spawning || !creep.id) return ERR_INVALID_TARGET;
      if (!admission.admit(owner,[structureKey(spawn.id),bodyKey(creep.id)])) return ERR_BUSY;
      return spawn.spawning.cancel();
    },
    renew(spawn: StructureSpawn, creep: Creep, owner: string): number {
      if (!spawn.my || !creep.my) return ERR_NOT_OWNER;
      if (spawn.room.name !== creep.room.name || !creep.body.length) return ERR_INVALID_TARGET;
      if (!allowed('body-owner:'+creep.id,owner)) return ERR_BUSY;
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
    react(lab: StructureLab,first: StructureLab,second: StructureLab,owner: string): number {
      if (!lab.my || !first.my || !second.my) return ERR_NOT_OWNER;
      if (new Set([lab.id,first.id,second.id]).size !== 3 || lab.room.name !== first.room.name || lab.room.name !== second.room.name) return ERR_INVALID_TARGET;
      if (![lab,first,second].every(item => allowed('lab-owner:'+item.id,owner))) return ERR_BUSY;
      if (!admission.admit(owner,[structureKey(lab.id)])) return ERR_BUSY;
      return lab.runReaction(first,second);
    },
    boost(lab: StructureLab, creep: Creep, owner: string,parts?: number): number {
      if (!lab.my || !creep.my) return ERR_NOT_OWNER;
      if (lab.room.name !== creep.room.name) return ERR_INVALID_TARGET;
      if (!validBoostCount(parts)) return ERR_INVALID_ARGS;
      if (!allowed('body-owner:'+creep.id,owner) || !allowed('lab-owner:'+lab.id,owner)) return ERR_BUSY;
      if (!admission.admit(owner, [structureKey(lab.id), bodyKey(creep.id)])) return ERR_BUSY;
      return parts === undefined ? lab.boostCreep(creep) : lab.boostCreep(creep,parts);
    },
  };
}

function validBoostCount(parts: number | undefined): boolean { return parts === undefined || (Number.isSafeInteger(parts) && parts >= 1 && parts <= 50); }
