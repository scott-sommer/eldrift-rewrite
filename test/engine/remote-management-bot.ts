import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeRemoteManagement } from '../../src/app/remotes/management/native';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { sourceMiner, courier } from '../../src/capabilities/spawning/economy-recipes';
import type { RemoteManagementRequest } from '../../src/features/remotes/management/model';
const state = createMemoryPort(() => Memory), assignments = createRemoteAssignmentStore(state), home = 'W0N1';
const manager = createNativeRemoteManagement(state,{ maximumRooms: 8,maximumOps: 10000 });
export function loop(): void {
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    assignments.reconcile({ home,tick: 1,lifetime: 23,expectedRevision: 0,plans: [{ room: 'W0N2',sources: ['operator-source'],reserve: null,infrastructure: null }] });
    state.write('sentinel/remote-management',{ owner: 'fixture',version: 1,data: { kept: ['operator',29] } });
  }
  const began = Game.cpu.getUsed(), result = manager.advance(request(),{ rooms: 1,sources: 1 },() => true);
  const record = createRemoteManagementStore(state,home).read(), lease = assignments.owner('E0N1',Game.time);
  const memory = Memory as Memory & { remoteManagementRows?: unknown[] };
  (memory.remoteManagementRows ??= []).push({ tick: Game.time,status: result.status,visible: !!Game.rooms.E0N1,
    sourceIndex: record.sourceIndex,scannedAt: record.scannedAt,startedAt: record.startedAt,reports: record.reports,offers: record.offers,
    portfolio: 'portfolio' in result ? result.portfolio : null,lease: lease ?? null,manual: assignments.owner('W0N2',Game.time) ?? null,
    cpu: Game.cpu.getUsed()-began,sentinel: state.read('sentinel/remote-management') });
}
function request(): RemoteManagementRequest {
  const maximumSlots = Game.time >= 22 && Game.time < 26 ? 0 : Game.time >= 15 && Game.time < 22 ? 1 : 2;
  return { home,tick: Game.time,policy: { candidates: [{ room: 'E0N1',commitment: { atomic: false,slots: 0,energyPerTick: 0,spawnLoad: 0 } }],
    traversal: { mode: 'known-safe',username: Game.rooms[home]!.controller!.owner!.username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
      maximumAge: 3,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 },
    economics: { regenerationTicks: ENERGY_REGEN_TIME,harvestPower: HARVEST_POWER,
      miner: { body: sourceMiner(550)!.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25 },
      hauler: { body: courier(200)!.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25,serviceTicks: 2 },
      reservation: { energyPerTick: 1,spawnLoad: 0.01,shares: 2 },infrastructurePerTick: 0.05,riskPerTick: 0,
      limits: { maximumHaulers: 20,maximumSpawnLoad: 1,minimumNetYield: 0.1 } },
    portfolio: { maximumAge: 50,maximumSlots,maximumHaulers: 40,maximumSpawnLoad: 2,minimumNetYield: 0.1,completionBonus: 0.15,order: 'nearest' },
    reserve: true,infrastructure: { roads: true,containers: true },leaseLifetime: 100,scanLifetime: 5,reassessInterval: 5 } };
}
