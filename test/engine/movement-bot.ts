import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { movementStep } from '../../src/capabilities/movement/step';
const arbiter = createActionArbiter(() => Game.time);
export function loop() {
  botLoop();
  const memory = Memory as Memory & { movementEvidence?: { outcomes: string[]; positions: number[][] } };
  memory.movementEvidence ??= { outcomes: [], positions: [] };
  const creep = Game.creeps['walker']!;
  const actions = createCreepActions(creep, 'walk', arbiter);
  const result = movementStep({ tick: Game.time, position: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y }, destination: { room: 'W0N1', x: 21, y: 20 }, range: 0, fatigue: creep.fatigue, allowPartial: false }, {
    route: () => ({ status: 'ready', direction: 3, incomplete: false }),
    move: direction => actions.move(direction as DirectionConstant),
    rejected: code => ({ status: 'failed', reason: String(code) }),
  });
  memory.movementEvidence.outcomes.push(result.status);
  memory.movementEvidence.positions.push([creep.pos.x, creep.pos.y]);
}
