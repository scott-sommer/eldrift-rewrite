import { loop as botLoop } from '../../src/main';
import { createNativeHaulingTask } from '../../src/app/native-hauling-task';
import { selectHaulingTask } from '../../src/app/select-hauling-task';
import { observeHauling } from '../../src/adapters/screeps/hauling-observation';
import { createTaskRunner } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
export function loop() {
  botLoop();
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['hauler']!;
  const containers = creep.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const sink = containers.find(item => item.pos.x === 21)!;
  const request = { id: 'fill', owner: 'test', source: source.id, sink: sink.id, resource: 'energy', quantity: 30, priority: 0, expiresAt: 100 };
  const queue = createLogisticsRequests(state, 'W0N1');
  queue.submit(request, Game.time);
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const behaviors = { haul: createNativeHaulingTask(state, { arbiter, movement },
    { version: 'hauling-cycle', blockedRooms: [], costs: {}, maximumRooms: 4 }) };
  selectHaulingTask(state, behaviors, { home: 'W0N1', name: creep.name, unitId: creep.id, tick: Game.time,
    cargoTotal: creep.store.getUsedCapacity() }, candidate => observeHauling(creep, candidate));
  const outcome = createTaskRunner(state, behaviors, () => Game.time)(creep.name, creep)!;
  movement.flush();
  const memory = Memory as Memory & { haulingCycle?: { statuses: string[]; outstanding: number[]; stores: number[][] } };
  const evidence = memory.haulingCycle ??= { statuses: [], outstanding: [], stores: [] };
  evidence.statuses.push(outcome.status === 'blocked' ? outcome.reason : outcome.status);
  evidence.outstanding.push(queue.pending(Game.time)[0]?.quantity ?? 0);
  evidence.stores.push([source.store.energy, creep.store.energy, sink.store.energy]);
}



