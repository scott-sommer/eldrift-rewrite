import { afterEach, expect, test, vi } from 'vitest';
import { movementAvoidance } from '../../src/adapters/screeps/movement-avoidance';
class Matrix {
  cells = new Map<string,number>();
  set(x: number,y: number,cost: number) { this.cells.set(`${x}:${y}`,cost); }
  get(x: number,y: number) { return this.cells.get(`${x}:${y}`) ?? 0; }
  clone() { const matrix = new Matrix(); matrix.cells = new Map(this.cells); return matrix; }
}
afterEach(() => vi.unstubAllGlobals());

test('overlays affect matrix/cache identity without contaminating other callers or unseen rooms', () => {
  vi.stubGlobal('PathFinder',{ CostMatrix: Matrix });
  const original = new Matrix(); original.set(10,10,255);
  const base = { version: 'base', matrix: (room: string) => room === 'W0N1' ? original.clone() as unknown as CostMatrix : undefined };
  const avoid = [{ room: 'W0N1', x: 20, y: 20 },{ room: 'E0N1', x: 25, y: 25 }];
  const first = movementAvoidance(base,avoid);
  avoid[0]!.x = 1;
  expect(first.matrix('W0N1')!.get(20,20)).toBe(255);
  expect(first.matrix('W0N1')!.get(10,10)).toBe(255);
  expect(original.get(20,20)).toBe(0);
  expect(first.matrix('E0N1')!.get(25,25)).toBe(255);
  expect(first.matrix('W1N1')).toBeUndefined();
  expect(first.version).not.toBe(movementAvoidance(base,avoid).version);
  expect(movementAvoidance(base,[])).toBe(base);
});
