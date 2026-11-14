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
declare global { interface Memory { recoveryEvidence?: { positions: number[][]; avoidance: boolean[]; outcomes: string[]; blockers: number[][] } } }
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
  move: (unit, direction) => createCreepActions(Game.getObjectById(unit as Id<Creep>)!, 'navigate', arbiter).move(direction as DirectionConstant),
  rejected: code => ({ status: 'failed', reason: String(code) }),
});
export function loop(): void {
  productionLoop();
  const evidence = Memory.recoveryEvidence ??= { positions: [], avoidance: [], outcomes: [], blockers: [] };
  const creep = Game.creeps['walker']!;
  const blocker = Game.creeps['blocker']!;
  evidence.positions.push([creep.pos.x, creep.pos.y]);
  evidence.blockers.push([blocker.pos.x, blocker.pos.y]);
  const outcome = navigate(creep.id, { tick: Game.time, position: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y },
    destination: { room: 'W0N1', x: 22, y: 20 }, range: 0, fatigue: creep.fatigue, allowPartial: false }, creep.getActiveBodyparts(MOVE) > 0);
  evidence.outcomes.push(outcome.status);
}
