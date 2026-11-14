import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { workStep } from '../../src/capabilities/work/step';
const arbiter = createActionArbiter(() => Game.time);
export function loop() {
  botLoop();
  const memory = Memory as Memory & { workEvidence?: Record<string, { outcomes: string[]; observed: number }> };
  memory.workEvidence ??= {};
  for (const name of ['build', 'repair', 'upgrade']) {
    const creep = Game.creeps[name]!;
    const actions = createCreepActions(creep, name, arbiter);
    const site = creep.room.find(FIND_MY_CONSTRUCTION_SITES)[0]!;
    const road = creep.room.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_ROAD)!;
    const controller = creep.room.controller!;
    const observed = name === 'build' ? site.progress : name === 'repair' ? road.hits : controller.progress;
    const goal = name === 'build' ? 5 : name === 'repair' ? 200 : 1;
    const act = name === 'build' ? () => actions.build(site) : name === 'repair' ? () => actions.repair(road) : () => actions.upgrade(controller);
    const outcome = workStep({ tick: Game.time, complete: observed >= goal, target: 'visible', inRange: true, energy: creep.store.energy }, {
      approach: () => ({ status: 'failed', reason: 'unexpected-travel' }), act,
      rejected: code => ({ status: 'failed', reason: String(code) }),
    });
    const entry = memory.workEvidence[name] ??= { outcomes: [], observed: 0 };
    entry.outcomes.push(outcome.status);
    entry.observed = observed;
  }
}
