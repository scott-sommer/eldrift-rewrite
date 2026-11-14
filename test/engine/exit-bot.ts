import { movementTransition } from '../../src/capabilities/movement/transition';
import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
const arbiter = createActionArbiter(() => Game.time);
const expected = new Map<string, { room: string; x: number; y: number }>();
const directions: Record<string, DirectionConstant> = { east: 3, west: 7, south: 5, north: 1 };
export function loop() {
  botLoop();
  const memory = Memory as Memory & { exitEvidence?: Record<string, (string | number)[][]> };
  memory.exitEvidence ??= {};
  for (const [name, direction] of Object.entries(directions)) {
    const creep = Game.creeps[name]!;
    const position = { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y };
    const previous = expected.get(name);
    if (previous && JSON.stringify(previous) !== JSON.stringify(position)) throw new Error('Unexpected exit landing');
    expected.set(name, movementTransition(position, direction)!.landing);
    const samples = memory.exitEvidence[name] ??= [];
    samples.push([creep.pos.roomName, creep.pos.x, creep.pos.y]);
    const result = createCreepActions(creep, 'exit-fixture', arbiter).move(direction);
    if (result.status !== 'issued') throw new Error('Exit movement rejected');
  }
}

