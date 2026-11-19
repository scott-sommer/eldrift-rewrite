import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createRemoteObservationRefresh } from '../../src/app/remotes/native-observations';
import { createNativeRemoteAssessment } from '../../src/app/remotes/assessment/native';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import { assignRemoteTask } from '../../src/app/remotes/assign-task';
import { validRemoteTaskPayload } from '../../src/app/remotes/task';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { traceReceipts } from './receipt-trace';
import type { RemoteAssessment } from '../../src/features/remotes/assessment-model';
const state = createMemoryPort(() => Memory), home = 'W0N1', room = 'E0N1';
const definitions = { 'remote-mine': { phases: ['work'],validPayload: validRemoteTaskPayload },haul: { phases: ['work'],validPayload: validHaulingPayload } };
interface Probe extends Memory { returnQuote?: RemoteAssessment; returnRows?: unknown[]; returnReceipts?: Record<string,number>; returnBindings?: Record<string,string> }
export function loop(): void {
  const memory = Memory as Probe;
  if (Game.time === 1) setup(memory);
  runtimeLoop();
  const creep = Game.creeps['swamp-return-miner'];
  const records = peekState(state,'logistics-requests/'+home,logisticsQueueSchema)?.records ?? [];
  traceReceipts(records,{ amounts: memory.returnReceipts ??= {},bindings: memory.returnBindings ??= {} });
  const journal = creep && state.read('logistics-attempts/'+creep.id) !== undefined ? createTransferJournal(state,creep.id).read() : undefined;
  (memory.returnRows ??= []).push({ tick: Game.time,unit: creep ? { id: creep.id,room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y,
    ttl: creep.ticksToLive,cargo: creep.store.energy,fatigue: creep.fatigue,tasks: peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue.map(task => task.kind) ?? [],journal } : null,
    population: creep?.memory.population,my: creep?.my,storage: Game.rooms[home]!.storage!.store.energy,credited: Object.values(memory.returnReceipts!).reduce((sum,n) => sum+n,0),
    claims: peekState(state,'quantity-reservations/empire',quantitySchema)?.claims.length ?? 0,
    pending: createSpawnQueue(state,home).list(),sentinel: state.read('fixture/swamp-return') });
}
function setup(memory: Probe): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: false,remoteScanRooms: 0,remoteScanSources: 0,
    remoteWorkerCpuBudget: 100,remoteCpuBudget: 100,remoteMaximumSlots: 1,intelMaximumAge: 1000 };
  saveState(state,'operator/config',operatorSchema,config);
  createRemoteObservationRefresh(state)([home,room]);
  const creep = Game.creeps['swamp-return-miner']!, source = Game.rooms[room]!.find(FIND_SOURCES)[0]!.id;
  const quote = measure(source,creep.owner.username); memory.returnQuote = quote;
  if (quote.status !== 'assessed' || quote.economics.status !== 'evaluated') throw new Error('Return fixture quote unavailable');
  const assignments = createRemoteAssignmentStore(state);
  const lease = assignments.reconcile({ home,tick: 1,lifetime: 1000,expectedRevision: 0,plans: [{ room,sources: [source],reserve: null,infrastructure: null }] });
  if (lease.status !== 'applied') throw new Error('Return fixture assignment failed');
  const identity = { home,room,source,kind: 'miner' as const }, owner = remoteFleetOwner(identity), timing = quote.economics.timing.miner;
  creep.memory.population = { home,owner };
  createRemoteFleetStore(state,home).save(0,1,[{ ...identity,owner,generation: lease.assignments[0]!.generation,body: creep.body.map(part => part.type),desired: 1,priority: 20,...timing }]);
  assignRemoteTask(state,definitions,'remote-mine',creep.name,remoteAssignmentDemands(lease.assignments[0]!,1)[0]!,1,creep.ticksToLive!);
  createSpawnQueue(state,home).submit({ id: 'unrelated-return',name: 'unrelated-return',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/swamp-return',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
function measure(source: string, username: string) {
  return createNativeRemoteAssessment(state,{ maximumRooms: 8,maximumOps: 10000 })({ home,room,source,tick: Game.time,
    traversal: { mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 1000,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 },
    economics: { regenerationTicks: 300,harvestPower: 2,miner: { body: ['work','work','work','work','carry','move','move'],lifetime: 1500,replacementMargin: 25 },
      hauler: { body: ['carry','carry','move','move'],lifetime: 1500,replacementMargin: 25,serviceTicks: 2 },
      reservation: { energyPerTick: 0,spawnLoad: 0,shares: 1 },infrastructurePerTick: 0,riskPerTick: 0,
      limits: { maximumHaulers: 20,maximumSpawnLoad: 2,minimumNetYield: 0 } } });
}
