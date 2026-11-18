import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observePopulation } from '../../src/adapters/screeps/population';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeRemoteMiningService } from '../../src/app/remotes/native-mining-service';
import { createRemoteMiningTaskBehavior } from '../../src/app/remotes/mining-task';
import { assignRemoteTask } from '../../src/app/remotes/assign-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteObservationRefresh } from '../../src/app/remotes/native-observations';
import { applyPopulationDemand } from '../../src/features/population/apply-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { openState, peekState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { stateKey } from '../../src/persistence/state-key';
import { operatorSchema } from '../../src/features/operator/state';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
const state = createMemoryPort(() => Memory), assignments = createRemoteAssignmentStore(state), dispatch = createNativeDispatch(state);
const refresh = createRemoteObservationRefresh(state);
const ports = createNativeRemoteMiningService(state,dispatch,{ maximumRooms: 8,guard: () => true,
  policy: (_home,username) => ({ mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
    maximumAge: 50,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) });
const behaviors = { 'remote-mine': createRemoteMiningTaskBehavior(state,ports) };
const run = createTaskRunner(state,behaviors,() => Game.time), owner = 'remote-mining-probe';
export function loop() {
  refresh(['W0N1','E0N1']);
  if (Game.time === 1) initialize();
  const lease = assignments.owner('E0N1',Game.time);
  const demand = lease ? remoteAssignmentDemands(lease,Game.time).find(item => item.kind === 'mine') : undefined;
  applyPopulationDemand(state,{ owner,room: 'W0N1',desired: demand ? 1 : 0,body: ['work','work','carry','move','move'],
    replacementParts: 5,travelTicks: 12,marginTicks: 5,priority: 50,requestLifetime: 1500 },observePopulation(),Game.time);
  const units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === owner);
  for (const creep of units) {
    if (creep.spawning) continue;
    if (demand) assignRemoteTask(state,behaviors,'remote-mine',creep.name,demand,Game.time,creep.ticksToLive ?? 1);
    run(creep.name,creep);
  }
  dispatch.activate(); dispatch.flush();
  const room = Game.rooms.E0N1, source = room?.find(FIND_SOURCES)[0];
  const container = room?.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_CONTAINER) as StructureContainer | undefined;
  const claims = peekState(state,'reservations/empire',reservationSchema)?.claims ?? [];
  const row = { tick: Game.time,visible: !!room,authority: !!demand,sourceEnergy: source?.energy ?? null,containerEnergy: container?.store.energy ?? null,
    pending: createSpawnQueue(state,'W0N1').list().filter(request => request.owner === owner).length,
    tileClaims: claims.filter(claim => claim.resource.startsWith('mining-tile:')),sentinel: claims.find(claim => claim.resource === 'sentinel'),
    units: units.map(creep => ({ name: creep.name,spawning: creep.spawning,room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y,
      cargo: creep.store.getUsedCapacity(),tasks: peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,behaviors))?.queue.length ?? 0 })) };
  const memory = Memory as Memory & { remoteMiningRows?: (typeof row)[] }; (memory.remoteMiningRows ??= []).push(row);
}
function initialize(): void {
  openState(state,'operator/config',operatorSchema);
  createReservations(state).acquire({ resource: 'sentinel',holder: 'fixture',scope: 'fixture',expiresAt: 1000 },Game.time);
  const source = Game.rooms.E0N1!.find(FIND_SOURCES)[0]!;
  assignments.reconcile({ home: 'W0N1',tick: Game.time,lifetime: 88,expectedRevision: 0,
    plans: [{ room: 'E0N1',sources: [source.id],reserve: null,infrastructure: null }] });
}
