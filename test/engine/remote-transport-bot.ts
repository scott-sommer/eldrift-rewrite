import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observePopulation } from '../../src/adapters/screeps/population';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeRemoteMiningCycle } from '../../src/app/remotes/native-mining-cycle';
import { createNativeRemoteTransportCycle } from '../../src/app/remotes/native-transport-cycle';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteObservationRefresh } from '../../src/app/remotes/native-observations';
import { applyPopulationDemand } from '../../src/features/population/apply-demand';
import { openState, peekState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { stateKey } from '../../src/persistence/state-key';
import { operatorSchema } from '../../src/features/operator/state';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { traceReceipts } from './receipt-trace';
const state = createMemoryPort(() => Memory), dispatch = createNativeDispatch(state), home = 'W0N1';
const assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state);
const options = { maximumRooms: 8,guard: () => true,policy: (_home: string,username: string) => ({ mode: 'known-safe' as const,username,
  allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 50,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) };
const miner = createNativeRemoteMiningCycle(state,dispatch,{ home,owner: 'transport-miner' },options);
const courier = createNativeRemoteTransportCycle(state,dispatch,{ home,owner: 'transport-courier' },{ ...options,minimumBatch: 20,requestLifetime: 100 });
const definitions = { ...miner.definitions,...courier.definitions };
interface ProbeMemory extends Memory { remoteTransportRows?: unknown[]; remoteTransportRevokedAt?: number; remoteTransportReceipts?: Record<string,number>; remoteTransportBindings?: Record<string,string> }
export function loop() { runTransportProbe(1); }
export function runTransportProbe(count: number): void {
  refresh([home,'E0N1']);
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    assignments.reconcile({ home,tick: 1,lifetime: 299,expectedRevision: 0,plans: [{ room: 'E0N1',sources: [Game.rooms.E0N1!.find(FIND_SOURCES)[0]!.id],reserve: null,infrastructure: null }] });
  }
  const memory = Memory as ProbeMemory, haulers = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === 'transport-courier');
  if (!memory.remoteTransportRevokedAt && Game.time >= 140 && haulers.some(creep => creep.pos.roomName === 'E0N1' && creep.store.energy >= 20)) {
    assignments.reconcile({ home,tick: Game.time,lifetime: 100,expectedRevision: assignments.read().revision,plans: [] });
    memory.remoteTransportRevokedAt = Game.time;
  }
  const lease = assignments.owner('E0N1',Game.time), demand = lease ? remoteAssignmentDemands(lease,Game.time).find(item => item.kind === 'mine') : undefined;
  const roster = observePopulation();
  for (const [owner,desired,body,priority] of [['transport-miner',1,['work','work','carry','move','move'],0],['transport-courier',count,['carry','carry','move','move'],10]] as const) {
    applyPopulationDemand(state,{ owner,room: home,desired: demand ? desired : 0,body,replacementParts: body.length,travelTicks: 12,marginTicks: 5,priority,requestLifetime: 1500 },roster,Game.time);
  }
  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.population?.owner === 'transport-miner') miner.run(creep,demand);
    if (creep.memory.population?.owner === 'transport-courier') courier.run(creep,demand);
  }
  dispatch.activate(); dispatch.flush(); snapshot(!!demand);
}
function snapshot(authority: boolean): void {
  const memory = Memory as ProbeMemory, amounts = memory.remoteTransportReceipts ??= {}, bindings = memory.remoteTransportBindings ??= {};
  const records = peekState(state,stateKey('logistics-requests',home),logisticsQueueSchema)?.records ?? [];
  traceReceipts(records,{ amounts,bindings });
  const room = Game.rooms.E0N1, source = room?.find(FIND_SOURCES)[0];
  const container = room?.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_CONTAINER) as StructureContainer | undefined;
  const stockPool = container ? logisticsPool('stock',container.id,RESOURCE_ENERGY) : '';
  const claims = peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? [];
  const stores = Game.rooms[home]!.find(FIND_STRUCTURES).filter(item => 'store' in item) as AnyStoreStructure[];
  const row = { tick: Game.time,authority,revokedAt: memory.remoteTransportRevokedAt ?? null,visible: !!room,
    sourceEnergy: source?.energy ?? null,containerEnergy: container?.store.energy ?? null,
    homeTotal: stores.reduce((sum,item) => sum + item.store.getUsedCapacity(RESOURCE_ENERGY),0),credited: Object.values(amounts).reduce((sum,amount) => sum + amount,0),
    stockReserved: claims.flatMap(claim => claim.allocations).filter(item => item.pool === stockPool).reduce((sum,item) => sum + item.amount,0),claims: claims.length,
    units: Object.values(Game.creeps).filter(creep => typeof creep.id === 'string' && creep.memory.population?.owner?.startsWith('transport-')).map(creep => {
      const key = stateKey('logistics-attempts',creep.id), journal = state.read(key) === undefined ? undefined : createTransferJournal(state,creep.id).read();
      return { name: creep.name,owner: creep.memory.population!.owner,room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y,cargo: creep.store.getUsedCapacity(),spawning: creep.spawning,
        tasks: peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue.map(task => task.kind) ?? [],
        journal: journal?.attempt ? { ...journal.attempt,acknowledged: journal.acknowledged,result: journal.result } : null };
    }) };
  (memory.remoteTransportRows ??= []).push(row);
}
