import { afterEach, expect, test, vi } from 'vitest';
import { repairBorderPath } from '../../src/adapters/screeps/path-border';
import type { PathRequest } from '../../src/capabilities/movement/path-model';
import type { Position } from '../../src/capabilities/movement/step';
class NativePosition { constructor(readonly x: number,readonly y: number,readonly roomName: string) {} }
afterEach(() => vi.unstubAllGlobals());
function fixture(origin: Position = { room: 'E0N1',x: 0,y: 24 }) {
  vi.stubGlobal('RoomPosition',NativePosition);
  const request: PathRequest = { origin,destination: { room: 'W0N1',x: 45,y: 25 },range: 3,
    profile: { id: 'test',plainCost: 2,swampCost: 10,maxOps: 100,maxRooms: 2 },topologyVersion: '1',policyVersion: '1' };
  const native = (position: Position) => new NativePosition(position.x,position.y,position.room) as RoomPosition;
  const initial = { path: [native({ room: 'W0N1',x: 49,y: 24 })],incomplete: false,ops: 10,cost: 2 };
  const matrix = () => ({ get: () => 2 }) as unknown as CostMatrix;
  return { request,initial,matrix,native };
}
test.each([
  [{ room: 'E0N1',x: 0,y: 24 },{ room: 'W0N1',x: 49,y: 24 },{ room: 'E0N1',x: 1,y: 24 }],
  [{ room: 'W0N1',x: 49,y: 24 },{ room: 'E0N1',x: 0,y: 24 },{ room: 'W0N1',x: 48,y: 24 }],
  [{ room: 'W1S0',x: 24,y: 0 },{ room: 'W1N0',x: 24,y: 49 },{ room: 'W1S0',x: 24,y: 1 }],
  [{ room: 'W1N0',x: 24,y: 49 },{ room: 'W1S0',x: 24,y: 0 },{ room: 'W1N0',x: 24,y: 48 }],
  [{ room: 'E0S0',x: 0,y: 0 },{ room: 'W0S0',x: 49,y: 0 },{ room: 'E0S0',x: 1,y: 1 }],
])('repairs an outward path from %j', (origin,landing,inward) => {
  const f = fixture(origin); f.initial.path = [f.native(landing)];
  const search = vi.fn<(origin: Position, maximumOps: number) => typeof f.initial>(() => ({ ...f.initial,path: [f.native({ room: 'E0N1',x: 0,y: 24 }),...f.initial.path] }));
  const result = repairBorderPath(f.request,f.matrix,f.initial,search);
  expect(search.mock.calls[0]?.[0]).toEqual(inward);
  expect(result.path[0]).toMatchObject({ roomName: inward.room,x: inward.x,y: inward.y });
  expect(result).toMatchObject({ incomplete: false,ops: 20,cost: 4 });
});
test('an already executable path is retained without extra searches',() => {
  const f = fixture(); f.initial.path = [f.native({ ...f.request.origin,x: 1 })];
  const search = vi.fn(); expect(repairBorderPath(f.request,f.matrix,f.initial,search)).toBe(f.initial);
  expect(search).not.toHaveBeenCalled();
});
test('recovery shares the original operation budget and returns partial work when exhausted',() => {
  const f = fixture(); f.request.profile.maxOps = 12;
  const budgets: number[] = [];
  const result = repairBorderPath(f.request,f.matrix,f.initial,(_origin,budget) => {
    budgets.push(budget); return { path: [],incomplete: true,cost: 0,ops: budget };
  });
  expect(result.incomplete).toBe(true); expect(result.ops).toBe(12);
  expect(budgets.reduce((sum,budget) => sum+budget,0)).toBe(2);
});
test('blocked inward tiles do not authorize an impossible outward path',() => {
  const f = fixture(), search = vi.fn();
  const result = repairBorderPath(f.request,() => ({ get: () => 255 }) as unknown as CostMatrix,f.initial,search);
  expect(result).toMatchObject({ incomplete: true,path: [],ops: 10 }); expect(search).not.toHaveBeenCalled();
});

test('a lateral arrival-border step is repaired when its actual landing would re-cross the room',() => {
  const f = fixture({ room: 'W0N1',x: 49,y: 21 });
  f.initial.path = [f.native({ room: 'W0N1',x: 49,y: 22 })];
  const search = vi.fn<(origin: Position, maximumOps: number) => typeof f.initial>(() => ({ ...f.initial,path: [] }));
  const result = repairBorderPath(f.request,f.matrix,f.initial,search);
  expect(search.mock.calls[0]?.[0]).toEqual({ room: 'W0N1',x: 48,y: 21 });
  expect(result.path[0]).toMatchObject({ roomName: 'W0N1',x: 48,y: 21 });
});
