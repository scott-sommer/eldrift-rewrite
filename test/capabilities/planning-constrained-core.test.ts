import { expect, test } from 'vitest';
import { stageConstrainedCore } from '../../src/capabilities/planning/constrained-core';
import { reactionGeometry } from '../../src/capabilities/planning/lab-geometry';
import type { TransformIndex } from '../../src/core/geometry/transforms';
const limits = {
  storage: [0, 0, 0, 0, 1, 1, 1, 1, 1], terminal: [0, 0, 0, 0, 0, 0, 1, 1, 1],
  link: [0, 0, 0, 0, 0, 2, 3, 4, 6], lab: [0, 0, 0, 0, 0, 0, 3, 6, 10],
  road: [0, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
};
test('constrained hub retains its exact core anchors and road/lab overlaps', () => {
  const core = stageConstrainedCore({ x: 25, y: 25 }, 0, limits)!;
  expect(core).toHaveLength(36);
  expect(core.find(entry => entry.type === 'terminal')).toMatchObject({
    position: { x: 26, y: 25 }, rcl: 6, tag: 'terminal',
  });
  expect(core.find(entry => entry.type === 'link')).toMatchObject({
    position: { x: 25, y: 26 }, rcl: 5, tag: 'storage',
  });
  const roads = core.filter(entry => entry.type === 'road');
  const labs = core.filter(entry => entry.type === 'lab');
  expect(roads).toHaveLength(23);
  expect(labs.filter(lab => roads.some(road =>
    road.position.x === lab.position.x && road.position.y === lab.position.y)).map(lab => lab.position))
    .toEqual(expect.arrayContaining([{ x: 25, y: 24 }, { x: 26, y: 24 }]));
});
test('compact labs remain functional through all stages and orientations', () => {
  for (let transform = 0; transform < 8; transform++) {
    const core = stageConstrainedCore({ x: 25, y: 25 }, transform as TransformIndex, limits)!;
    for (let rcl = 6; rcl <= 8; rcl++) {
      expect(reactionGeometry(core.filter(entry => entry.type === 'lab' && entry.rcl <= rcl)
        .map(entry => entry.position))).toBeDefined();
    }
  }
});
test('compact hub preserves separate anchor, structure and outer footprint margins', () => {
  expect(stageConstrainedCore({ x: 2, y: 25 }, 0, limits)).toBeUndefined();
  expect(stageConstrainedCore({ x: 25, y: 5 }, 0, limits)).toBeUndefined();
  expect(stageConstrainedCore({ x: 25, y: 6 }, 0, limits)).toHaveLength(36);
});
