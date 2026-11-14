import { createTrafficAuthority } from '../../src/capabilities/movement/traffic/authority';
import { movementTransition } from '../../src/capabilities/movement/transition';
import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
const arbiter = createActionArbiter(() => Game.time);
const expected = new Map<string, { room: string; x: number; y: number }>();
const directions: Record<string, DirectionConstant> = { east: 3, west: 7, south: 5, north: 1 };
const traffic = createTrafficAuthority({
  clock: () => Game.time,
  observe: () => Object.values(Game.creeps).map(creep => ({
    unit: creep.name, position: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y },
  })),
  legal: () => true, // This fixture explicitly supplies unobstructed plain exits.
  issue: request => createCreepActions(Game.creeps[request.unit]!, request.owner, arbiter).move(directions[request.unit]!),
});
export function loop() {
  botLoop();
  const memory = Memory as Memory & { exitEvidence?: Record<string, (string | number)[][]> };
  memory.exitEvidence ??= {};
  for (const [name, direction] of Object.entries(directions)) {
    const creep = Game.creeps[name]!;
    const position = { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y };
    const previous = expected.get(name);
    if (previous && JSON.stringify(previous) !== JSON.stringify(position)) throw new Error('Unexpected exit landing');
    const transition = movementTransition(position, direction)!;
    expected.set(name, transition.landing);
    const samples = memory.exitEvidence[name] ??= [];
    samples.push([creep.pos.roomName, creep.pos.x, creep.pos.y]);
    traffic.submit({ unit: name, owner: 'exit-fixture', from: position, to: transition.landing, via: transition.local, priority: 0, mobile: true });

  }
  const batch = traffic.flush()!;
  if (batch.resolution.denied.length || batch.outcomes.some(outcome => !('intent' in outcome) || outcome.intent.status !== 'issued')) {
    throw new Error('Exit movement rejected');
  }
}
