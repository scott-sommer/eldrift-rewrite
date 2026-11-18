import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observePopulation } from '../../src/adapters/screeps/population';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeRemoteMiningCycle } from '../../src/app/remotes/native-mining-cycle';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteObservationRefresh } from '../../src/app/remotes/native-observations';
import { applyPopulationDemand } from '../../src/features/population/apply-demand';
import { openState, peekState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { stateKey } from '../../src/persistence/state-key';
import { operatorSchema } from '../../src/features/operator/state';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { schema as incidentSchema } from '../../src/features/logistics/uncertainty';
const state = createMemoryPort(() => Memory), assignments = createRemoteAssignmentStore(state), dispatch = createNativeDispatch(state);
const refresh = createRemoteObservationRefresh(state), home = 'W0N1', owner = 'remote-banking-probe';
const cycle = createNativeRemoteMiningCycle(state,dispatch,{ home,owner },{ maximumRooms: 8,guard: () => true,
  policy: (_home,username) => ({ mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
    maximumAge: 50,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) });
interface ProbeMemory extends Memory { remoteBankingRows?: unknown[]; remoteBankingRevokedAt?: number; remoteBankingSkipped?: number; remoteBankingReceipts?: Record<string,number>; remoteBankingReceiptBindings?: Record<string,string> }
export function loop() { runBankingProbe(false); }
export function runBankingProbe(skipConfirmation: boolean): void {
  refresh([home,'E0N1']);
  if (Game.time === 1) initialize();
  const memory = Memory as ProbeMemory, units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === owner);
  if (!memory.remoteBankingRevokedAt && Game.time >= 100 && units.some(creep => creep.pos.roomName === 'E0N1' && creep.store.energy >= 20)) {
    assignments.reconcile({ home,tick: Game.time,expectedRevision: assignments.read().revision,lifetime: 50,plans: [] });
    memory.remoteBankingRevokedAt = Game.time;
  }
  const lease = assignments.owner('E0N1',Game.time), demand = lease ? remoteAssignmentDemands(lease,Game.time).find(item => item.kind === 'mine') : undefined;
  applyPopulationDemand(state,{ owner,room: home,desired: demand ? 1 : 0,body: ['work','work','carry','move','move'],replacementParts: 5,
    travelTicks: 12,marginTicks: 5,priority: 50,requestLifetime: 1500 },observePopulation(),Game.time);
  for (const creep of units) {
    const prior = journal(creep.id);
    if (skipConfirmation && !memory.remoteBankingSkipped && prior?.attempt?.tick === Game.time - 1 && !prior.acknowledged) {
      memory.remoteBankingSkipped = Game.time; continue;
    }
    cycle.run(creep,demand);
  }
  dispatch.activate(); dispatch.flush(); snapshot(units,!!demand);
}
function initialize(): void {
  openState(state,'operator/config',operatorSchema);
  createReservations(state).acquire({ resource: 'sentinel',holder: 'fixture',scope: 'fixture',expiresAt: 1000 },Game.time);
  createQuantityReservations(state).reserve({ id: 'sentinel',owner: 'fixture',holder: 'fixture',scope: 'fixture',expiresAt: 1000,
    allocations: [{ pool: 'fixture',amount: 7 }] },{ fixture: 7 },Game.time);
  createLogisticsRequests(state,home).submit({ id: 'sentinel',owner: 'fixture',source: 'fixture-source',sink: 'fixture-sink',resource: 'energy',quantity: 3,priority: 0,expiresAt: 1000 },Game.time);
  assignments.reconcile({ home,tick: Game.time,lifetime: 299,expectedRevision: 0,
    plans: [{ room: 'E0N1',sources: [Game.rooms.E0N1!.find(FIND_SOURCES)[0]!.id],reserve: null,infrastructure: null }] });
}
function journal(unit: string) {
  return state.read(stateKey('logistics-attempts',unit)) === undefined ? undefined : createTransferJournal(state,unit).read();
}
function snapshot(units: Creep[], authority: boolean): void {
  const memory = Memory as ProbeMemory, receipts = memory.remoteBankingReceipts ??= {};
  const records = peekState(state,stateKey('logistics-requests',home),logisticsQueueSchema)?.records ?? [];
  for (const record of records) for (const receipt of record.receipts) rememberReceipt(receipt.id,receipt.amount,JSON.stringify([record.request.owner,record.request.id]));
  const quantities = peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? [];
  const mutexes = peekState(state,'reservations/empire',reservationSchema)?.claims ?? [];
  const stores = Game.rooms[home]!.find(FIND_STRUCTURES).filter(item => 'store' in item) as AnyStoreStructure[];
  const row = { tick: Game.time,authority,revokedAt: memory.remoteBankingRevokedAt ?? null,
    homeTotal: stores.reduce((sum,item) => sum + item.store.getUsedCapacity(RESOURCE_ENERGY),0),
    credited: Object.values(receipts).reduce((sum,amount) => sum + amount,0),bankClaims: quantities.filter(claim => claim.owner !== 'fixture').length,
    tileClaims: mutexes.filter(claim => claim.resource.startsWith('mining-tile:')).length,quantitySentinel: quantities.find(claim => claim.id === 'sentinel'),
    mutexSentinel: mutexes.find(claim => claim.resource === 'sentinel'),requestSentinel: records.find(record => record.request.id === 'sentinel'),
    units: units.map(creep => {
      const prior = journal(creep.id), tasks = peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,cycle.definitions))?.queue ?? [];
      return { id: creep.id,name: creep.name,spawning: creep.spawning,room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y,cargo: creep.store.getUsedCapacity(),
        tasks: tasks.map(task => ({ id: task.id,kind: task.kind })),
        journal: prior?.attempt ? { id: prior.attempt.id,tick: prior.attempt.tick,amount: prior.attempt.amount,acknowledged: prior.acknowledged,result: prior.result } : null,
        uncertainty: peekState(state,stateKey('logistics-uncertainty',creep.id),incidentSchema)?.entries ?? [] };
    }) };
  (memory.remoteBankingRows ??= []).push(row);
}

function rememberReceipt(id: string, amount: number, binding: string): void {
  const memory = Memory as ProbeMemory, receipts = memory.remoteBankingReceipts ??= {}, bindings = memory.remoteBankingReceiptBindings ??= {};
  if (Object.hasOwn(bindings,id) && bindings[id] !== binding) throw new Error('One receipt credited multiple requests');
  if (Object.hasOwn(receipts,id) && receipts[id] !== amount) throw new Error('Receipt amount changed after credit');
  receipts[id] = amount; bindings[id] = binding;
}
