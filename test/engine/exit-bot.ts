import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
const arbiter = createActionArbiter(() => Game.time);
const directions: Record<string, DirectionConstant> = { east: 3, west: 7, south: 5, north: 1 };
export function loop() {
  botLoop();
  const memory = Memory as Memory & { exitEvidence?: Record<string, (string | number)[][]> };
  memory.exitEvidence ??= {};
  for (const [name, direction] of Object.entries(directions)) {
    const creep = Game.creeps[name]!;
    const samples = memory.exitEvidence[name] ??= [];
    samples.push([creep.pos.roomName, creep.pos.x, creep.pos.y]);
    const result = createCreepActions(creep, 'exit-fixture', arbiter).move(direction);
    if (result.status !== 'issued') throw new Error('Exit movement rejected');
  }
}
