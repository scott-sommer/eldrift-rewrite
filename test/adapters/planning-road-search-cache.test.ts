import { afterEach, expect, test, vi } from 'vitest';
import { createPlanningRoadSearchCache } from '../../src/adapters/screeps/planning-road-search-cache';
afterEach(() => vi.unstubAllGlobals());
class Matrix {
  values = new Uint8Array(2500);
  set(x: number, y: number, cost: number) { this.values[y * 50 + x] = cost; }
  get(x: number, y: number) { return this.values[y * 50 + x]!; }
  clone() { const result = new Matrix(); result.values.set(this.values); return result; }
}
function setup() {
  const matrices: Matrix[] = [];
  const CostMatrix = class extends Matrix { constructor() { super(); matrices.push(this); } };
  const searches: Matrix[] = [];
  vi.stubGlobal('PathFinder', { CostMatrix, search: (_start: unknown, _goal: unknown,
    options: { roomCallback(room: string): Matrix | false }) => {
    const matrix = options.roomCallback('W0N1') as Matrix;
    searches.push(matrix);
    return { path: [], incomplete: false, cost: 0 };
  } });
  vi.stubGlobal('RoomPosition', class { constructor(public x: number, public y: number, public roomName: string) {} });
  return { matrices, searches };
}
test('resumed scoring reuses one base matrix while searches isolate road and blocker overlays', () => {
  const { matrices, searches } = setup(), prepare = createPlanningRoadSearchCache('W0N1', 2000);
  const costs = Array<number>(2500).fill(2), start = { x: 10, y: 10 }, goal = { x: 20, y: 20 };
  prepare(costs)(start, goal, [{ x: 12, y: 12 }], [{ x: 13, y: 13 }]);
  prepare([...costs])(start, goal, []);
  expect(matrices).toHaveLength(1);
  expect(searches[0]!.get(12, 12)).toBe(1);
  expect(searches[0]!.get(13, 13)).toBe(255);
  expect(searches[1]!.get(12, 12)).toBe(2);
  expect(searches[1]!.get(13, 13)).toBe(2);
  costs[0] = 255;
  prepare(costs)(start, goal, []);
  expect(matrices).toHaveLength(2);
  expect(searches[2]!.get(0, 0)).toBe(255);
});
test('invalid changes fail validation and leave the prior network reusable; owners are independent', () => {
  const { matrices } = setup(), prepare = createPlanningRoadSearchCache('W0N1', 2000);
  const costs = Array<number>(2500).fill(2), first = prepare(costs);
  expect(() => prepare(Array<number>(2500).fill(NaN))).toThrow('costs');
  expect(() => prepare(Array<number>(2499).fill(2))).toThrow('costs');
  expect(prepare(costs)).toBe(first);
  expect(createPlanningRoadSearchCache('W0N1', 2000)(costs)).not.toBe(first);
  expect(matrices).toHaveLength(2);
});
