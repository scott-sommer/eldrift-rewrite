import { loop as botLoop } from '../../src/main';
import { createHaulingTaskBehavior } from '../../src/app/hauling-task';
import { assignHaulingTask } from '../../src/app/assign-hauling-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeTransfer } from '../../src/adapters/screeps/transfer';
import { observeTransfer } from '../../src/adapters/screeps/transfer-observation';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
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
  const transfer = createNativeTransfer(arbiter, movement, createTransferJournal(state, creep.id).begin);
  const behaviors = { haul: createHaulingTaskBehavior<Creep>(state, {
    identity: worker => ({ id: worker.id, name: worker.name }),
    view: () => ({
    tick: Game.time, cargo: creep.store.energy, freeCargo: creep.store.getFreeCapacity(), sourceStock: source.store.energy,
    sinkFree: sink.store.getFreeCapacity(), sinkPool: logisticsPool('capacity', sink.id),
    }),
    execution: (_worker, binding) => ({
    observe: observeTransfer,
    execute: (_request, phase, amount, attemptId, requestKey) => {
      const target = phase === 'collect' ? source : sink;
      return transfer(creep, { owner: binding.scope, target: target.id, position: { room: target.pos.roomName, x: target.pos.x, y: target.pos.y },
        resource: RESOURCE_ENERGY, kind: phase === 'collect' ? 'withdraw' : 'transfer', maximum: amount, attemptId, requestKey,
        policy: { version: 'hauling-cycle', blockedRooms: [], costs: {}, maximumRooms: 4 } });
    },
    }),
  }) };
  assignHaulingTask(state, behaviors, creep.name, 'haul:' + Game.time, { home: 'W0N1', unitId: creep.id, request }, Game.time, 100);
  const outcome = createTaskRunner(state, behaviors, () => Game.time)(creep.name, creep)!;
  movement.flush();
  const memory = Memory as Memory & { haulingCycle?: { statuses: string[]; outstanding: number[]; stores: number[][] } };
  const evidence = memory.haulingCycle ??= { statuses: [], outstanding: [], stores: [] };
  evidence.statuses.push(outcome.status === 'blocked' ? outcome.reason : outcome.status);
  evidence.outstanding.push(queue.pending(Game.time)[0]?.quantity ?? 0);
  evidence.stores.push([source.store.energy, creep.store.energy, sink.store.energy]);
}

