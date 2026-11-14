import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';

test('all eight template orientations retain anchor-relative geometry', () => {
  const ctx = legacy(['TRANSFORMS', 'transformRelative', 'normalizeCoreTemplate', 'anchorFromWorld']);
  const expected = [[2, 3], [-3, 2], [-2, -3], [3, -2], [-2, 3], [2, -3], [3, 2], [-3, -2]];
  expected.forEach(([x, y], index) => expect(ctx.transformRelative({ x: 2, y: 3 }, index)).toEqual({ x, y }));
  expect(ctx.normalizeCoreTemplate({ spawn: [{ x: 25, y: 15 }] }, { x: 23, y: 12 })).toEqual({ spawn: [{ x: 2, y: 3 }] });
  expect(ctx.anchorFromWorld({ x: 25, y: 15 }, { x: 2, y: 3 })).toEqual({ x: 23, y: 12 });
});

test('construction ordering uses level then distance before manual priority', () => {
  const ctx = legacy(['buildKey', 'sortEntries']);
  const entry = (level, distance, priority, x) => ({ level, distance, priority, t: 'extension', pos: { x, y: 10 } });
  const manual = entry(3, 8, -1000, 1);
  const closer = entry(3, 2, 0, 2);
  const earlier = entry(2, 9, 0, 3);
  expect(ctx.sortEntries([manual, closer, earlier])).toEqual([earlier, closer, manual]);
});

test.each([[99, 0, 0], [100, 2, 50], [150, 3, 100], [250, 5, 150], [1600, 32, 1050], [5000, 32, 1050]])('road scavenger budget %i retains legacy body policy', (budget, count, capacity) => {
  const ctx = legacy(['buildRoadScavengerBody', 'getCarryCapacityForBody'], { CARRY: 'carry', MOVE: 'move', CARRY_CAPACITY: 50 });
  const body = ctx.buildRoadScavengerBody(budget);
  expect(body).toHaveLength(count);
  expect(ctx.getCarryCapacityForBody(body)).toBe(capacity);
  expect(body.length * 50).toBeLessThanOrEqual(budget);
});
