import { afterEach,expect,test,vi } from 'vitest';
import { createRoomCostObservations } from '../../src/adapters/screeps/cost-observations';
import { observeCostMatrix } from '../../src/adapters/screeps/cost-matrix';
const room = (name: string) => ({ name }) as Room;
const facts = () => ({ roads: [{ x: 1,y: 1 }],obstacles: [{ x: 2,y: 2 }],units: [{ id: 'a',x: 3,y: 3 },{ id: 'b',x: 4,y: 4 }] });
afterEach(() => vi.unstubAllGlobals());
test('native geometry snapshots detach and freeze inputs and refresh on tick or room identity changes',() => {
  let tick = 1; const input = facts(), read = vi.fn(() => input), observe = createRoomCostObservations(read,() => tick);
  const firstRoom = room('W0N0'), first = observe(firstRoom);
  expect(observe(firstRoom)).toBe(first); expect(read).toHaveBeenCalledTimes(1);
  input.roads[0]!.x = 9; input.units[0]!.x = 9;
  expect(first.roads[0]!.x).toBe(1); expect(first.units[0]!.x).toBe(3);
  expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(first.roads)).toBe(true);
  expect(() => { (first.units[0] as { x: number }).x = 8; }).toThrow();
  const replaced = observe(room('W0N0')); expect(replaced).not.toBe(first); expect(replaced.roads[0]!.x).toBe(9);
  tick++; expect(observe(firstRoom)).not.toBe(first); expect(read).toHaveBeenCalledTimes(3);
  tick = 0; observe(firstRoom); expect(read).toHaveBeenCalledTimes(4);
});
test('geometry storage is bounded and evicted rooms are observed again',() => {
  const read = vi.fn(facts), observe = createRoomCostObservations(read,() => 1,1), a = room('W0N0'), b = room('E0N0');
  observe(a); observe(b); observe(a); expect(read).toHaveBeenCalledTimes(3);
  expect(() => createRoomCostObservations(read,() => 1,0)).toThrow();
});
test('matrix variants share geometry while isolating occupancy, road costs, mutation and vision loss',() => {
  class Matrix {
    cells = new Map<string,number>(); set(x: number,y: number,cost: number) { this.cells.set(x+':'+y,cost); }
    get(x: number,y: number) { return this.cells.get(x+':'+y) ?? 0; }
  }
  const visible = room('W0N0'), rooms: Record<string,Room> = { W0N0: visible }, read = vi.fn(facts), observe = createRoomCostObservations(read,() => 1);
  vi.stubGlobal('Game',{ rooms }); vi.stubGlobal('PathFinder',{ CostMatrix: Matrix });
  const first = observeCostMatrix('W0N0',{ roadCost: 1,avoidUnits: true,ignoreUnitId: 'a' },observe);
  const second = observeCostMatrix('W0N0',{ roadCost: 2,avoidUnits: true,ignoreUnitId: 'b' },observe);
  const staticOnly = observeCostMatrix('W0N0',{ roadCost: 1,avoidUnits: false },observe);
  expect(read).toHaveBeenCalledTimes(1);
  expect(first.matrix!.get(3,3)).toBe(0); expect(first.matrix!.get(4,4)).toBe(255);
  expect(second.matrix!.get(3,3)).toBe(255); expect(second.matrix!.get(4,4)).toBe(0);
  expect(first.matrix!.get(1,1)).toBe(1); expect(second.matrix!.get(1,1)).toBe(2);
  expect(staticOnly.matrix!.get(3,3)).toBe(0); expect(staticOnly.matrix!.get(2,2)).toBe(255);
  first.matrix!.set(1,1,99); expect(staticOnly.matrix!.get(1,1)).toBe(1);
  delete rooms.W0N0; expect(observeCostMatrix('W0N0',{ roadCost: 1,avoidUnits: false },observe).visible).toBe(false);
  rooms.W0N0 = room('W0N0'); observeCostMatrix('W0N0',{ roadCost: 1,avoidUnits: false },observe); expect(read).toHaveBeenCalledTimes(2);
});
