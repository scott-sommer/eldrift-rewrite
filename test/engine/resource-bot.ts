import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { transferStep } from '../../src/capabilities/resources/step';
const arbiter = createActionArbiter(() => Game.time);
export function loop() {
  botLoop();
  const memory = Memory as Memory & { resourceEvidence?: { outcomes: string[]; stores: number[][] } };
  memory.resourceEvidence ??= { outcomes: [], stores: [] };
  const creep = Game.creeps['hauler']!;
  const containers = creep.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const source = containers.find(item => item.pos.x === 19)!;
  const sink = containers.find(item => item.pos.x === 21)!;
  const delivering = creep.store.energy > 0 || sink.store.energy >= 10;
  const actions = createCreepActions(creep, 'resource-task', arbiter);
  const outcome = transferStep({ tick: Game.time, complete: sink.store.energy >= 10, target: 'visible', inRange: true,
    available: delivering ? creep.store.energy : source.store.energy,
    capacity: delivering ? sink.store.getFreeCapacity(RESOURCE_ENERGY) : creep.store.getFreeCapacity(RESOURCE_ENERGY), remaining: 10,
  }, {
    approach: () => ({ status: 'failed', reason: 'unexpected-travel' }),
    transfer: amount => delivering ? actions.transfer(sink, RESOURCE_ENERGY, amount) : actions.withdraw(source, RESOURCE_ENERGY, amount),
    rejected: code => ({ status: 'failed', reason: String(code) }),
  });
  memory.resourceEvidence.outcomes.push(outcome.status);
  memory.resourceEvidence.stores.push([source.store.energy, creep.store.energy, sink.store.energy]);
}
