import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeRemoteInfrastructure } from '../../src/app/remotes/infrastructure/native';
import { createNativeRemoteWorkCycle } from '../../src/app/remotes/infrastructure/work-cycle';
import { createNativeWorkerCollection } from '../../src/app/native-worker-collection';
import { createConstructionReservationLedger } from '../../src/features/construction/reservation-ledger';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteObservationRefresh } from '../../src/app/remotes/native-observations';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { defaults } from '../../src/config/model';
import { openState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { traceReceipts } from './receipt-trace';
import type { RemoteOutpostDemand } from '../../src/features/remotes/infrastructure/model';
const state = createMemoryPort(() => Memory), home = 'W0N1', remote = 'E0N1', owner = 'road-fixture-builder';
const dispatch = createNativeDispatch(state), assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state);
const options = { maximumRooms: 8,guard: () => true,policy: (_home: string,username: string) => ({ mode: 'known-safe' as const,username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 1000,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) };
const construction = createNativeRemoteInfrastructure(state,createConstructionReservationLedger(),{ ...options,maximumOps: 10000,sourceSearches: 1,roomSites: 80 });
const collect = createNativeWorkerCollection(state,dispatch), config = { ...defaults,workerEnergyProfile: 'builder' as const,workerEnergyStorageReserve: 0 };
const cycle = createNativeRemoteWorkCycle(state,dispatch,{ home,owner },options,{ collect: (creep,name,scope) => collect(creep,name,scope,config) });
interface Probe extends Memory { roadRows?: unknown[]; roadRevoked?: number; roadRefunds?: Record<string,number>; roadBindings?: Record<string,string> }
export function loop(): void {
  const memory = Memory as Probe, creep = Game.creeps['road-worker']!;
  if (Game.time === 1) setup(creep);
  refresh([home,remote]);
  const roads = Object.values(Game.rooms).flatMap(room => room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_ROAD));
  if (!memory.roadRevoked && roads.some(road => road.pos.roomName === remote && road.pos.x <= 2) && creep.pos.roomName === remote && creep.store.energy > 0) {
    assignments.reconcile({ home,tick: Game.time,lifetime: 1000,expectedRevision: assignments.read().revision,plans: [] }); memory.roadRevoked = Game.time;
  }
  const lease = assignments.owner(remote,Game.time), demand = lease && remoteAssignmentDemands(lease,Game.time).find((item): item is RemoteOutpostDemand => item.kind === 'outpost');
  if (demand) { construction.plan(home,demand); construction.run(home,demand,{ rooms: 2,entries: 20,attempts: 10 }); }
  cycle.run(creep,demand); dispatch.flush();
  const records = peekState(state,'logistics-requests/'+home,logisticsQueueSchema)?.records ?? [];
  traceReceipts(records,{ amounts: memory.roadRefunds ??= {},bindings: memory.roadBindings ??= {} });
  const sites = Object.values(Game.constructionSites).filter(site => site.structureType === STRUCTURE_ROAD);
  (memory.roadRows ??= []).push({ tick: Game.time,revoked: memory.roadRevoked ?? null,storage: Game.rooms[home]!.storage!.store.energy,
    cargo: creep.store.energy,room: creep.pos.roomName,tasks: peekState(state,'tasks/'+creep.name,taskSchema(creep.name,cycle.definitions))?.queue.map(task => task.kind) ?? [],
    roads: roads.map(road => ({ room: road.pos.roomName,x: road.pos.x,y: road.pos.y })),progress: sites.reduce((sum,site) => sum+site.progress,0),
    sites: sites.map(site => ({ id: site.id,room: site.pos.roomName,x: site.pos.x,y: site.pos.y,progress: site.progress })),
    refunded: Object.values(memory.roadRefunds!).reduce((sum,n) => sum+n,0),claims: peekState(state,'quantity-reservations/empire',quantitySchema)?.claims.length ?? 0,
    pending: createSpawnQueue(state,home).list(),sentinel: state.read('fixture/road-worker') });
}
function setup(creep: Creep): void {
  openState(state,'operator/config',operatorSchema); creep.memory.population = { home,owner };
  assignments.reconcile({ home,tick: Game.time,lifetime: 1000,expectedRevision: 0,plans: [{ room: remote,sources: [Game.rooms[remote]!.find(FIND_SOURCES)[0]!.id],reserve: null,infrastructure: { roads: true,containers: false } }] });
  createSpawnQueue(state,home).submit({ id: 'unrelated-road',name: 'unrelated-road',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/road-worker',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
