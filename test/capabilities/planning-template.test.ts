import { legacyStandardTemplate as raw } from '../fixtures/legacy-standard-template';
import { expect, test } from 'vitest';
import { standardTemplate } from '../../src/capabilities/planning/standard-template';
import { placeTemplate } from '../../src/capabilities/planning/template';
import type { TransformIndex } from '../../src/core/geometry/transforms';
test('standard template exactly reconstructs the legacy absolute footprint and ordering', () => {
  expect(placeTemplate(standardTemplate, { x: 23, y: 12 }, 0)?.map(entry => ({
    type: entry.type, ...entry.position,
  }))).toEqual(raw);
  const counts = Object.fromEntries([...new Set(raw.map(entry => entry.type))].map(type =>
    [type, raw.filter(entry => entry.type === type).length]));
  expect(counts).toEqual({
    lab: 10, tower: 6, road: 43, extension: 60, terminal: 1, spawn: 3,
    storage: 1, powerSpawn: 1, nuker: 1, link: 1, observer: 1,
  });
});
test('all eight orientations preserve structures and pairwise Chebyshev distances', () => {
  for (let index = 0; index < 8; index++) {
    const placed = placeTemplate(standardTemplate, { x: 25, y: 25 }, index as TransformIndex)!;
    expect(placed).toHaveLength(raw.length);
    expect(new Set(placed.map(entry => entry.position.x + ':' + entry.position.y)).size).toBe(raw.length);
    expect(placed.find(entry => entry.type === 'storage')?.position).toEqual({ x: 25, y: 25 });
    for (let a = 0; a < raw.length; a++) for (let b = a + 1; b < raw.length; b++) {
      expect(Math.max(Math.abs(placed[a]!.position.x - placed[b]!.position.x),
        Math.abs(placed[a]!.position.y - placed[b]!.position.y))).toBe(
        Math.max(Math.abs(raw[a]!.x - raw[b]!.x), Math.abs(raw[a]!.y - raw[b]!.y)));
    }
  }
});
test('edge footprints fail atomically and returned positions cannot mutate the template', () => {
  expect(placeTemplate(standardTemplate, { x: 2, y: 2 }, 0)).toBeUndefined();
  const first = placeTemplate(standardTemplate, { x: 25, y: 25 }, 0)!;
  first[0]!.position.x = 0;
  expect(placeTemplate(standardTemplate, { x: 25, y: 25 }, 0)![0]!.position.x).toBe(22);
});
