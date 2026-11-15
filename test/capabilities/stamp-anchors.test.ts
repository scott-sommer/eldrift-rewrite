import { expect, test } from 'vitest';
import { stampAnchors } from '../../src/capabilities/planning/stamp-anchors';
import { planningObservation } from '../fixtures/planning-observation';
import type { TransformIndex } from '../../src/core/geometry/transforms';
import { placeOffset } from '../../src/core/geometry/transforms';
const stamp = { id: 'offset-spawn', tiles: [{ type: 'spawn', offset: { x: 2, y: 0 }, rcl: 1 }], ports: [{ x: 0, y: 0 }] };
test('all transformed anchors that reuse owned or locked structures precede ordinary anchors', () => {
  const observation = planningObservation();
  observation.infrastructure = [{ id: 'existing', type: 'spawn', position: { x: 40, y: 30 }, owned: true, walkable: false }];
  const anchors = stampAnchors(stamp, { x: 25, y: 25 }, observation, 8);
  expect(anchors.slice(0, 4)).toHaveLength(4);
  for (const anchor of anchors.slice(0, 4)) {
    expect([0, 1, 2, 3, 4, 5, 6, 7].some(transform =>
      JSON.stringify(placeOffset(anchor, stamp.tiles[0]!.offset, transform as TransformIndex)) === JSON.stringify({ x: 40, y: 30 }))).toBe(true);
  }
  expect(anchors[4]).toEqual({ x: 25, y: 25 });
});
test('source ordering and duplicate lock observations cannot alter deterministic anchor order', () => {
  const observation = planningObservation();
  observation.infrastructure = [20, 30].map(x => ({ id: String(x), type: 'spawn', position: { x, y: 25 }, owned: true, walkable: false }));
  observation.constraints = [{ id: 'manual', kind: 'locked', type: 'spawn', position: { x: 20, y: 25 } }];
  const expected = stampAnchors(stamp, { x: 25, y: 25 }, observation, 100);
  observation.infrastructure = [...observation.infrastructure].reverse();
  expect(stampAnchors(stamp, { x: 25, y: 25 }, observation, 100)).toEqual(expected);
  expect(new Set(expected.map(tile => tile.y * 50 + tile.x)).size).toBe(expected.length);
});
test('hostile infrastructure is not promoted and output is bounded and detached', () => {
  const observation = planningObservation();
  observation.infrastructure = [{ id: 'enemy', type: 'spawn', position: { x: 40, y: 40 }, owned: false, walkable: false }];
  const center = { x: 25, y: 25 };
  expect(stampAnchors(stamp, center, observation, 1)).toEqual([center]);
  const anchors = stampAnchors(stamp, center, observation, 2500);
  expect(anchors).toHaveLength(46 * 46);
  anchors[0]!.x = 0;
  expect(center.x).toBe(25);
  expect(() => stampAnchors(stamp, center, observation, 0)).toThrow('policy');
});
