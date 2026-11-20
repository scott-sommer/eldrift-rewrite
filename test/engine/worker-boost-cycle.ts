import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { workOwner } from '../../src/features/work/identity';
import { haulingOwner } from '../../src/features/logistics/identity';
import type { BoostAttempt } from '../../src/capabilities/industry/boosts/model';
export type WorkerBoostMode = 'normal' | 'shortage' | 'optional';
interface WorkerRow { name: string; ready: boolean; status: string; acknowledged: boolean; work: number; energy: number; attempt: BoostAttempt | null }
interface Row { tick: number; progress: number; units: WorkerRow[]; pending: number; contracts: number; labMineral: number; labEnergy: number }
declare global { interface Memory { workerBoostRows?: Row[] } }
const state = createMemoryPort(() => Memory), owner = workOwner('W0N1','upgrader');
export function runWorkerBoosts(mode: WorkerBoostMode): void {
  const room = Game.rooms['W0N1']!;
  Game.creeps['boost-courier']!.memory.population = { owner: haulingOwner(room.name),home: room.name };
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { workersEnabled: true,workerSpawningEnabled: true,workerMode: 'upgrader',workerUpgraderTarget: mode === 'normal' ? 2 : 1,workerBodyBudget: 250,
    workerBoostPolicy: mode === 'optional' ? 'optional' : 'required',workerBoostTimeout: 80,workerUpgradeReserve: 0,logisticsEnabled: true };
  saveState(state,'operator/config',operatorSchema,config);
  botLoop();
  const jobs = createBoostRequests(state), pending = createSpawnQueue(state,room.name).list();
  const lab = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB)!;
  const units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === owner).map(creep => {
    const job = jobs.read().find(job => job.request.unit === creep.id);
    return { name: creep.name,ready: job ? jobs.readiness(owner,job.request.id) === 'ready' : false,status: job?.status ?? 'none',acknowledged: job?.acknowledged ?? false,
      work: creep.body.filter(part => part.type === WORK && part.boost === RESOURCE_CATALYZED_GHODIUM_ACID).length,energy: creep.store.energy,attempt: job?.attempt ?? null };
  });
  (Memory.workerBoostRows ??= []).push({ tick: Game.time,progress: room.controller!.progress,units,pending: pending.length,contracts: pending.filter(request => !!request.boost).length,
    labMineral: lab.mineralAmount,labEnergy: lab.store.energy });
}
