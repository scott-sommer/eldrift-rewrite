import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observePopulation } from '../../src/adapters/screeps/population';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeReservationService } from '../../src/app/remotes/native-reservation-service';
import { createReservationTaskBehavior } from '../../src/app/remotes/reservation-task';
import { assignReservationTask } from '../../src/app/remotes/assign-reservation-task';
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
import { createNativeControllerActions } from '../../src/adapters/screeps/controller-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
const state = createMemoryPort(() => Memory), assignments = createRemoteAssignmentStore(state), dispatch = createNativeDispatch(state);
const refresh = createRemoteObservationRefresh(state);
const ports = createNativeReservationService(state,dispatch,{ maximumRooms: 8,guard: () => true,
  policy: (_home,username) => ({ mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
    maximumAge: 10,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) });
const behaviors = { reserve: createReservationTaskBehavior(state,ports) };
const run = createTaskRunner(state,behaviors,() => Game.time);
const owner = 'reservation-probe';
export function loop() {
  refresh(['W0N1','E0N1']);
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    state.write('sentinel/reservation',{ owner: 'fixture',version: 1,data: { preserved: 17 } });
    const controller = Game.rooms.E0N1!.controller!;
    assignments.reconcile({ home: 'W0N1',tick: Game.time,lifetime: 109,expectedRevision: 0,
      plans: [{ room: 'E0N1',sources: [],reserve: { id: controller.id,position: { room: 'E0N1',x: controller.pos.x,y: controller.pos.y } },infrastructure: null }] });
  }
  const lease = assignments.owner('E0N1',Game.time);
  const demand = lease ? remoteAssignmentDemands(lease,Game.time).find(item => item.kind === 'reserve') : undefined;
  applyPopulationDemand(state,{ owner,room: 'W0N1',desired: demand && Game.time < 105 ? 1 : 0,body: ['claim','claim','move','move'],
    replacementParts: 4,travelTicks: 12,marginTicks: 5,priority: 50,requestLifetime: 600 },observePopulation(),Game.time);
  const units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === owner);
  const calls: { unit: string; code: number; duplicate: number }[] = [];
  const original = dispatch.controllers.reserve;
  dispatch.controllers.reserve = (creep,controller,actionOwner) => {
    const code = original(creep,controller,actionOwner);
    const duplicate = createNativeControllerActions(state,createActionArbiter(() => Game.time)).reserve(creep,controller,actionOwner);
    calls.push({ unit: creep.name,code,duplicate }); return code;
  };
  for (const creep of units) {
    if (creep.spawning) continue;
    if (demand) assignReservationTask(state,behaviors,creep.name,demand,Game.time,creep.ticksToLive ?? 1);
    run(creep.name,creep);
  }
  dispatch.controllers.reserve = original;
  dispatch.activate(); dispatch.flush();
  const controller = Game.rooms.E0N1!.controller!;
  const row = { tick: Game.time,reservation: controller.reservation ?? null,authority: !!demand,calls,
    pending: createSpawnQueue(state,'W0N1').list().filter(request => request.owner === owner).length,
    units: units.map(creep => ({ name: creep.name,spawning: creep.spawning,ttl: creep.ticksToLive ?? 0,room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y,
      tasks: peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,behaviors))?.queue.length ?? 0 })),
    witness: state.read('sentinel/reservation') };
  const memory = Memory as Memory & { remoteReservationRows?: (typeof row)[] };
  (memory.remoteReservationRows ??= []).push(row);
}
