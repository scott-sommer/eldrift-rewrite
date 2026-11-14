import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createNativeTransfer } from '../../src/adapters/screeps/transfer';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { observeTransfer } from '../../src/adapters/screeps/transfer-observation';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
export function loop() {
  botLoop();
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['hauler']!;
  const containers = creep.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const sink = containers.find(item => item.pos.x === 21)!;
  const memory = Memory as Memory & { transferEvidence?: { confirmed: number[]; receipts: boolean[]; stores: number[][]; duplicateBlocked: boolean } };
  const evidence = memory.transferEvidence ??= { confirmed: [], receipts: [], stores: [], duplicateBlocked: true };
  const journal = createTransferJournal(state, creep.id);
  const requests = createLogisticsRequests(state, 'W0N1');
  requests.submit({ id: 'delivery', owner: 'test', source: source.id, sink: sink.id, resource: 'energy', quantity: 30, priority: 0, expiresAt: 100 }, Game.time);
  const previous = journal.read().attempt;
  if (previous) {
    const result = journal.settle(observeTransfer(previous));
    if (result?.status !== 'observed') throw new Error('Expected native transfer confirmation');
    evidence.confirmed.push(result.amount);
    if (previous.kind === 'transfer') evidence.receipts.push(requests.confirm('test', 'delivery', { id: previous.id, amount: result.amount }, Game.time));
    else journal.acknowledge(previous.id);
  }
  if (!previous || previous.kind === 'withdraw') {
    const kind = previous ? 'transfer' : 'withdraw';
    const target = previous ? sink : source;
    const attempt = { id: kind + ':' + Game.time, unit: creep.id, target: target.id, room: creep.room.name,
      resource: RESOURCE_ENERGY, kind, tick: Game.time, amount: 30, cargoBefore: creep.store.energy } as const;
    const arbiter = createActionArbiter(() => Game.time);
    const movement = createMovementService(arbiter);
    const transfer = createNativeTransfer(arbiter, movement, journal.begin);
    const result = transfer(creep, { owner: 'test', attemptId: attempt.id, target: target.id,
      position: { room: target.pos.roomName, x: target.pos.x, y: target.pos.y },
      resource: RESOURCE_ENERGY, kind, maximum: 30,
      policy: { version: 'native-transfer-test', blockedRooms: [], costs: {}, maximumRooms: 4 } });
    evidence.duplicateBlocked &&= !createTransferJournal(state, creep.id).begin(attempt);
    if (result.status !== 'running') throw new Error('Expected native transfer execution');
    movement.flush();
  }
  evidence.stores.push([source.store.energy, creep.store.energy, sink.store.energy]);
}


