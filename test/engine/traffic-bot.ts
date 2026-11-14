import { loop as productionLoop } from '../../src/main';
import { resolveTraffic } from '../../src/capabilities/movement/traffic/resolve';
import type { TrafficRequest } from '../../src/capabilities/movement/traffic/model';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
const arbiter = createActionArbiter(() => Game.time);
declare global { interface Memory { trafficEvidence?: { accepted: string[]; denied: unknown[]; positions: number[][]; intents: string[] } } }
export function loop(): void {
  productionLoop();
  const creeps = ['a', 'b', 'c'].map(name => Game.creeps[name]!);
  if (!Memory.trafficEvidence) {
    const requests: TrafficRequest[] = creeps.map(creep => ({ unit: creep.name, owner: 'traffic-test',
      from: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y },
      to: { room: creep.pos.roomName, x: creep.name === 'b' ? 20 : 21, y: 20 },
      priority: creep.name === 'c' ? 0 : 1, mobile: creep.fatigue === 0 && creep.getActiveBodyparts(MOVE) > 0,
    }));
    const occupants = requests.map(request => ({ unit: request.unit, position: request.from }));
    const result = resolveTraffic(requests, occupants, request => request.from.room === request.to.room && Math.abs(request.to.x - request.from.x) === 1);
    const intents = result.accepted.map(request => {
      const creep = Game.creeps[request.unit]!;
      return createCreepActions(creep, request.owner, arbiter).move(creep.pos.getDirectionTo(request.to.x, request.to.y)).status;
    });
    Memory.trafficEvidence = { accepted: result.accepted.map(request => request.unit), denied: result.denied, positions: [], intents };
  }
  Memory.trafficEvidence.positions.push(creeps.map(creep => creep.pos.x));
}
