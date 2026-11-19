import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { snapshotPipeline, pipelineIncome } from './remote-pipeline-probe';
import type { PipelineMemory } from './remote-pipeline-probe';
const state = createMemoryPort(() => Memory), home = 'W0N1';
export function loop(): void {
  const memory = Memory as PipelineMemory;
  if (Game.time === 1) setup();
  if (!memory.pipelineStopped && Game.time >= 800 && pipelineIncome(memory) >= 3000 && Object.values(Game.creeps).some(creep => remoteFleetIdentity(creep.memory.population?.owner ?? '')?.kind === 'courier' && creep.pos.roomName === 'E0N1' && creep.store.energy > 0)) {
    const config = openState(state,'operator/config',operatorSchema); config.empire = { ...config.empire as object,remoteMaximumSlots: 0 };
    saveState(state,'operator/config',operatorSchema,config); memory.pipelineStopped = Game.time;
  }
  runtimeLoop(); snapshotPipeline(state,memory);
}
function setup(): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { scoutsEnabled: true,scoutSpawningEnabled: true,scoutCount: 1,scoutAssignedRooms: ['E0N1'],scoutDemandInterval: 1,scoutPlanCpuBudget: 100,scoutControlCpuBudget: 100,
    remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteReservationEnabled: true,remoteReservationBodyBudget: 1300,remoteReservationEnergyReserve: 0,
    remoteWorkerCpuBudget: 100,remoteCpuBudget: 100,backgroundCpuFraction: 0.9,remoteDepth: 1,remoteBlockedRooms: ['W0N0','W0N2','W1N1'],remoteDiscoveryRefresh: 10,remoteDiscoveryReads: 4,
    remoteMaximumSlots: 2,remoteWorkerMaximumUnits: 10,remoteMaximumSpawnLoad: 2,remoteMaximumPathOps: 10000,remoteReassessInterval: 30,
    remoteLeaseLifetime: 200,remoteScanLifetime: 50,intelMaximumAge: 200,remoteContainersEnabled: false,
    logisticsEnabled: true,energyRequestsEnabled: true,distributorSpawningEnabled: true,distributorTarget: 1,distributorBodyBudget: 150,
    recoveryEnabled: false,miningEnabled: false,energyBankingEnabled: false,storeBalancingEnabled: false,preservationEnabled: false };
  saveState(state,'operator/config',operatorSchema,config);
  createSpawnQueue(state,home).submit({ id: 'unrelated-pipeline',name: 'unrelated-pipeline',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/remote-pipeline',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
