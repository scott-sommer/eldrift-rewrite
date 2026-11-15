import { expect, test } from 'vitest';
import { reactionGeometry } from '../../src/capabilities/planning/lab-geometry';
import { standardTemplate } from '../../src/capabilities/planning/standard-template';
import { placeTemplate } from '../../src/capabilities/planning/template';
import { stagePositions } from '../../src/capabilities/planning/staging';
import { stageReactionLabs } from '../../src/capabilities/planning/lab-staging';
import type { TransformIndex } from '../../src/core/geometry/transforms';
test('every standard lab stage supports all output labs under every orientation', () => {
  for (let transform = 0; transform < 8; transform++) {
    const labs = placeTemplate(standardTemplate, { x: 25, y: 25 }, transform as TransformIndex)!
      .filter(entry => entry.type === 'lab').map(entry => entry.position);
    const stages = stageReactionLabs(labs, { x: 25, y: 25 }, [0, 0, 0, 0, 0, 0, 3, 6, 10], 6);
    for (let rcl = 6; rcl <= 8; rcl++) {
      const permanentInputs = reactionGeometry(labs)!.inputs;
      const active = stages.filter(entry => entry.rcl <= rcl).map(entry => entry.position);
      for (const input of permanentInputs) expect(active).toContainEqual(input);
      for (const output of active) for (const input of permanentInputs) {
        expect(Math.abs(output.x - input.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(output.y - input.y)).toBeLessThanOrEqual(2);
      }
      const geometry = reactionGeometry(active)!;
      expect(geometry).toBeDefined();
      expect(geometry.outputs).toHaveLength(active.length - 2);
      for (const output of geometry.outputs) for (const input of geometry.inputs) {
        expect(Math.abs(output.x - input.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(output.y - input.y)).toBeLessThanOrEqual(2);
      }
      expect(reactionGeometry([...active].reverse())).toEqual(geometry);
    }
  }
});
test('range two diagonals work but a distant output invalidates an otherwise plausible cluster', () => {
  expect(reactionGeometry([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 12, y: 12 }])).toBeDefined();
  expect(reactionGeometry([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 20, y: 20 }])).toBeUndefined();
  expect(reactionGeometry([{ x: 10, y: 10 }, { x: 10, y: 11 }])).toBeUndefined();
  expect(() => reactionGeometry([{ x: 10, y: 10 }, { x: 10, y: 10 }])).toThrow('Duplicate');
});

test('legacy nearest-storage stages reproduce the defect that reagent-first ordering corrects', () => {
  let invalidStages = 0;
  for (let transform = 0; transform < 8; transform++) {
    const labs = placeTemplate(standardTemplate, { x: 25, y: 25 }, transform as TransformIndex)!
      .filter(entry => entry.type === 'lab').map(entry => entry.position);
    const legacy = stagePositions(labs, { x: 25, y: 25 }, [0, 0, 0, 0, 0, 0, 3, 6, 10], 6);
    for (let rcl = 6; rcl <= 8; rcl++) {
      if (!reactionGeometry(legacy.filter(entry => entry.rcl <= rcl).map(entry => entry.position))) invalidStages++;
    }
  }
  expect(invalidStages).toBeGreaterThan(0);
});
