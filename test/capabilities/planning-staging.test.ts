import { expect, test } from 'vitest';
import { stagePositions } from '../../src/capabilities/planning/staging';
import { standardTemplate } from '../../src/capabilities/planning/standard-template';
import { placeTemplate } from '../../src/capabilities/planning/template';
const anchor = { x: 25, y: 25 };
test('all sixty standard extensions unlock in legacy RCL batches nearest storage first', () => {
  const positions = placeTemplate(standardTemplate, anchor, 0)!
    .filter(entry => entry.type === 'extension').map(entry => entry.position);
  const limits = [0, 0, 5, 10, 20, 30, 40, 50, 60];
  const staged = stagePositions(positions, anchor, limits, 2);
  for (let level = 1; level <= 8; level++) {
    expect(staged.filter(entry => entry.rcl <= level)).toHaveLength(limits[level]!);
  }
  const distance = (p: { x: number; y: number }) => Math.max(Math.abs(p.x - 25), Math.abs(p.y - 25));
  expect(staged.map(entry => distance(entry.position))).toEqual(
    positions.map(distance).sort((a, b) => a - b));
  expect(stagePositions([...positions].reverse(), anchor, limits, 2)).toEqual(staged);
});
test('delayed minimum level includes previously unlocked capacity and clones input', () => {
  const positions = [{ x: 26, y: 25 }, { x: 24, y: 25 }, { x: 25, y: 26 }];
  const result = stagePositions(positions, anchor, [0, 1, 1, 1, 1, 1, 1, 2, 3], 7);
  expect(result.map(entry => entry.rcl)).toEqual([7, 7, 8]);
  expect(result.map(entry => entry.position.x)).toEqual([24, 25, 26]);
  result[0]!.position.x = 0;
  expect(positions[1]!.x).toBe(24);
});
test('invalid limits, duplicate positions and excess capacity fail instead of silently dropping structures', () => {
  const limits = [0, 1, 1, 1, 1, 1, 1, 1, 1];
  expect(() => stagePositions([anchor, anchor], anchor, limits, 1)).toThrow('Duplicate');
  expect(() => stagePositions([anchor, { x: 26, y: 25 }], anchor, limits, 1)).toThrow('capacity');
  expect(() => stagePositions([], anchor, limits.slice(1), 1)).toThrow('limits');
  expect(() => stagePositions([], anchor, [0, 1, 0, 1, 1, 1, 1, 1, 1], 1)).toThrow('limits');
  expect(() => stagePositions([], anchor, limits, 0)).toThrow('RCL');
});
