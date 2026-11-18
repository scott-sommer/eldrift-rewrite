import { afterEach, expect, test, vi } from 'vitest';
import { retainedRemoteCosts } from '../../src/app/remote-retained-costs';
import { intelSummary } from '../fixtures/intel-summary';
afterEach(() => vi.unstubAllGlobals());
test('retained infrastructure keeps blockers and roads, conservatively blocks foreign ramparts and detaches coordinates', () => {
  vi.stubGlobal('OBSTACLE_OBJECT_TYPES',['spawn','rampart']);
  const summary = intelSummary(); summary.structures = [
    { id: 'road',x: 5,y: 5,type: 'road',owner: null,owned: false,hostile: false },
    { id: 'foreign',x: 6,y: 6,type: 'rampart',owner: 'ally',owned: false,hostile: false },
    { id: 'own',x: 7,y: 7,type: 'rampart',owner: 'bot',owned: true,hostile: false },
    { id: 'box',x: 8,y: 8,type: 'container',owner: null,owned: false,hostile: false } ];
  const result = retainedRemoteCosts(summary);
  expect(result.roads).toEqual([{ x: 5,y: 5 }]); expect(result.obstacles).toContainEqual({ x: 6,y: 6 });
  expect(result.obstacles).not.toContainEqual({ x: 7,y: 7 }); expect(result.obstacles).not.toContainEqual({ x: 8,y: 8 });
  expect(result.obstacles).toContainEqual({ x: 10,y: 10 }); expect(result.units).toEqual([]);
  result.obstacles[0]!.x = 1; expect(summary.structures[1]!.x).toBe(6);
});
