import { createGameLoop } from '../../src/app/game-loop';
import { createGamePorts } from '../../src/adapters/screeps/runtime';
import { createTrafficDispatch } from '../../src/capabilities/movement/traffic/dispatch';
import { loop as productionLoop } from '../../src/main';
import { createNativePathSearch } from '../../src/adapters/screeps/path-search';
import { observeCostMatrix } from '../../src/adapters/screeps/cost-matrix';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createPathService } from '../../src/capabilities/movement/path-service';
import { createNavigator } from '../../src/capabilities/movement/navigator';
let matrix: CostMatrix | undefined;
const paths = createPathService(createNativePathSearch(() => matrix), () => Game.time);
const arbiter = createActionArbiter(() => Game.time);
declare global { interface Memory { recoveryEvidence?: { positions: number[][]; avoidance: boolean[]; outcomes: string[]; blockers: number[][]; issued: number[] } } }
const dispatch = createTrafficDispatch({ clock: () => Game.time,
  observe: () => Object.values(Game.creeps).map(creep => ({ unit: creep.id, position: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y } })),
  legal: request => request.from.room === request.to.room && Math.max(Math.abs(request.from.x - request.to.x), Math.abs(request.from.y - request.to.y)) === 1,
  issue: request => {
    const creep = Game.getObjectById(request.unit as Id<Creep>)!;
    return createCreepActions(creep, request.owner, arbiter).move(creep.pos.getDirectionTo(request.to.x, request.to.y));
  },
}, (unit, tick, outcome) => navigate.settle(unit, tick, outcome));
const navigate = createNavigator({ paths,
  request(view, avoidUnits) {
    Memory.recoveryEvidence!.avoidance.push(avoidUnits);
    const snapshot = observeCostMatrix(view.position.room, { roadCost: 1, avoidUnits, ignoreUnitId: Game.creeps['walker']!.id });
    matrix = snapshot.matrix;
    return { origin: view.position, destination: view.destination, range: 0,
      profile: { id: 'walker', plainCost: 2, swampCost: 10, maxOps: 2000, maxRooms: 1 },
      topologyVersion: snapshot.version, policyVersion: 'local', allowedRooms: ['W0N1'] };
  },
  direction: (origin, next) => new RoomPosition(origin.x, origin.y, origin.room).getDirectionTo(new RoomPosition(next.x, next.y, next.room)),
  move: (unit, direction) => {
    const creep = Game.getObjectById(unit as Id<Creep>)!;
    const [dx, dy] = [[0,0],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]][direction]!;
    const from = { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y };
    return dispatch.submit({ unit, owner: 'navigate', from, to: { ...from, x: from.x + dx!, y: from.y + dy! }, priority: 0, mobile: true });
  },
  rejected: code => ({ status: 'failed', reason: String(code) }),
});
function planMovement(): void {
  const evidence = Memory.recoveryEvidence ??= { positions: [], avoidance: [], outcomes: [], blockers: [], issued: [] };
  const creep = Game.creeps['walker']!;
  const blocker = Game.creeps['blocker']!;
  evidence.positions.push([creep.pos.x, creep.pos.y]);
  evidence.blockers.push([blocker.pos.x, blocker.pos.y]);
  const outcome = navigate(creep.id, { tick: Game.time, position: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y },
    destination: { room: 'W0N1', x: 22, y: 20 }, range: 0, fatigue: creep.fatigue, allowPartial: false }, creep.getActiveBodyparts(MOVE) > 0);
  evidence.outcomes.push(outcome.status);
}
function flushMovement(): void {
  const evidence = Memory.recoveryEvidence!;
  const batch = dispatch.flush();
  evidence.issued.push(batch?.outcomes.filter(result => 'intent' in result && result.intent.status === 'issued').length ?? 0);
}

const featureLoop = createGameLoop([
  { id: 'movement-fixture', urgency: 'urgent', interval: 1, run: planMovement },
], { ...createGamePorts(), config: () => ({}) }, () => true, flushMovement);
export function loop(): void {
  productionLoop();
  featureLoop();
  featureLoop(); // Same-tick entry cannot plan or issue twice.
}
