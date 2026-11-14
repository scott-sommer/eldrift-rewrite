import { loop as productionLoop } from '../../src/main';
import { createNativePathSearch } from '../../src/adapters/screeps/path-search';
import { createPathService } from '../../src/capabilities/movement/path-service';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
const nativeSearch = createNativePathSearch(() => undefined);
let searches = 0;
const paths = createPathService(request => { searches++; return nativeSearch(request); }, () => Game.time);
const arbiter = createActionArbiter(() => Game.time);
declare global { interface Memory { pathEvidence?: { searches: number[]; positions: number[][]; statuses: string[] } } }
export function loop(): void {
  productionLoop();
  const evidence = Memory.pathEvidence ??= { searches: [], positions: [], statuses: [] };
  const creep = Game.creeps['walker']!;
  const request = {
    origin: { room: 'W0N1', x: 20, y: 20 }, destination: { room: 'W0N1', x: 21, y: 20 }, range: 0,
    profile: { id: 'walker', plainCost: 1, swampCost: 5, maxOps: 2000, maxRooms: 1 },
    topologyVersion: evidence.searches.length === 2 ? 'changed' : 'initial', policyVersion: 'safe', allowedRooms: ['W0N1'],
  };
  const result = paths.find(request);
  paths.find(request);
  evidence.searches.push(searches);
  evidence.positions.push([creep.pos.x, creep.pos.y]);
  evidence.statuses.push(result.status);
  if (result.status !== 'complete') throw new Error('Expected complete native path');
  const end = result.path.at(-1)!;
  if (end.room !== 'W0N1' || end.x !== 21 || end.y !== 20) throw new Error('Incorrect native path endpoint');
  if (creep.pos.x === 20) {
    const next = result.path[0]!;
    createCreepActions(creep, 'walk', arbiter).move(creep.pos.getDirectionTo(new RoomPosition(next.x, next.y, next.room)));
  }
  const excluded = nativeSearch({ ...request, allowedRooms: [] });
  if (excluded.status !== 'no-route') throw new Error('Room policy was bypassed');
}
