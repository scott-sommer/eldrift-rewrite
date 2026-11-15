import { assessRoom } from '../../src/capabilities/planning/assessment';
import { validateStageAccess } from '../../src/capabilities/planning/access-validation';
import { legacyConstrainedTemplate } from '../../src/capabilities/planning/constrained-template';
import { placeTemplate } from '../../src/capabilities/planning/template';
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
  expect(core).toHaveLength(37);
  expect(core.find(entry => entry.type === 'terminal')).toMatchObject({
    position: { x: 26, y: 25 }, rcl: 6, tag: 'terminal',
  });
  expect(core.find(entry => entry.type === 'link')).toMatchObject({
    position: { x: 25, y: 26 }, rcl: 5, tag: 'storage',
  });
  const roads = core.filter(entry => entry.type === 'road');
  const labs = core.filter(entry => entry.type === 'lab');
  expect(roads).toHaveLength(24);
  expect(labs.filter(lab => roads.some(road =>
    road.position.x === lab.position.x && road.position.y === lab.position.y)).map(lab => lab.position))
    .toEqual(expect.arrayContaining([{ x: 25, y: 20 }, { x: 26, y: 24 }]));
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
  expect(stageConstrainedCore({ x: 25, y: 6 }, 0, limits)).toHaveLength(37);
});

test('corrected hub fixes the legacy enclosed lab in every orientation', () => {
  const assessment = assessRoom({ terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] });
  const blocks = (type: string) => type !== 'road';
  for (let transform = 0; transform < 8; transform++) {
    const legacy = placeTemplate(legacyConstrainedTemplate, { x: 25, y: 25 }, transform as TransformIndex)!
      .map(entry => ({ ...entry, rcl: 8 }));
    expect(validateStageAccess(assessment, legacy, blocks).find(stage => stage.rcl === 8)?.connected).toBe(false);
    const corrected = stageConstrainedCore({ x: 25, y: 25 }, transform as TransformIndex, limits)!;
    expect(validateStageAccess(assessment, corrected, blocks).every(stage => stage.connected)).toBe(true);
  }
});
