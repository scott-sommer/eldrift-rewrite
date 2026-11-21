import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { workOwner } from '../../src/features/work/identity';
import type { BoostAttempt } from '../../src/capabilities/industry/boosts/model';
interface UnitRow { name: string; parts: number; spawning: boolean; ready: boolean; status: string; energy: number; boosted: { move: number; carry: number; work: number }; attempt: BoostAttempt | null }
interface Row { tick: number; available: number; progress: number; complete: boolean; units: UnitRow[]; pending: { name: string; parts: number; steps: number }[]; labs: { resource: string | null; amount: number; energy: number }[] }
declare global { interface Memory { boostedBuilderRows?: Row[] } }
const state = createMemoryPort(() => Memory), owner = workOwner('W0N1','builder');
export function runBoostedBuilder(): void {
  const room = Game.rooms.W0N1!, available = room.energyAvailable;
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { workersEnabled: true,workerSpawningEnabled: true,workerMode: 'builder',workerBuilderTarget: 2,workerBuilderRecipe: 'boosted',workerBodyBudget: 3500,
    workerBoostPolicy: 'required',workerBoostTimeout: 200,workerUpgradeReserve: 1000000 };
  saveState(state,'operator/config',operatorSchema,config); botLoop();
  const jobs = createBoostRequests(state), pending = createSpawnQueue(state,room.name).list();
  const units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === owner).map(creep => {
    const job = jobs.read().find(job => job.request.unit === creep.id);
    const count = (part: BodyPartConstant,resource: MineralBoostConstant) => creep.body.filter(item => item.type === part && item.boost === resource).length;
    return { name: creep.name,parts: creep.body.length,spawning: creep.spawning,ready: job ? jobs.readiness(owner,job.request.id) === 'ready' : false,status: job?.status ?? 'none',energy: creep.store.energy,
      boosted: { move: count(MOVE,RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE),carry: count(CARRY,RESOURCE_CATALYZED_KEANIUM_ACID),work: count(WORK,RESOURCE_CATALYZED_LEMERGIUM_ACID) },attempt: job?.attempt ?? null };
  });
  const site = room.find(FIND_MY_CONSTRUCTION_SITES).find(item => item.pos.x === 22 && item.pos.y === 21);
  const complete = room.find(FIND_STRUCTURES).some(item => item.structureType === STRUCTURE_ROAD && item.pos.x === 22 && item.pos.y === 21);
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  (Memory.boostedBuilderRows ??= []).push({ tick: Game.time,available,progress: site?.progress ?? 0,complete,units,pending: pending.map(item => ({ name: item.name,parts: item.body.length,steps: item.boost?.steps.length ?? 0 })),
    labs: labs.map(lab => ({ resource: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY) })) });
}
