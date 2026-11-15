import { expect, test } from 'vitest';
import { enumeratePlanningCandidates } from '../../src/features/planning/candidate-enumeration';
import { standardCandidates } from '../../src/capabilities/planning/standard-candidates';
import { constrainedAnchors } from '../../src/capabilities/planning/constrained-anchors';
import { constrainedFootprint } from '../../src/capabilities/planning/constrained-footprint';
import type { TransformIndex } from '../../src/core/geometry/transforms';
import { advancePlanningJob } from '../../src/features/planning/planning-job';
const options = { standard: { storage: { x: 25, y: 25 }, structures: [] },
  constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 36 } };
test('serialized enumeration retains every fitting candidate in both legacy strategy orders', () => {
  let result = enumeratePlanningCandidates(options, undefined, 37);
  let attempts = result.attempts;
  while (!result.done) {
    expect(result).not.toHaveProperty('source');
    result = enumeratePlanningCandidates(options, JSON.parse(JSON.stringify(result.checkpoint)), 37);
    expect(result.attempts).toBeLessThanOrEqual(37);
    attempts += result.attempts;
  }
  const expected = standardCandidates(options.standard).map(candidate => ({ ...candidate, strategy: 'standard',
    id: 'standard:' + candidate.anchor.x + ':' + candidate.anchor.y + ':' + candidate.transform }));
  for (const anchor of constrainedAnchors(options.constrained)) for (let transform = 0; transform < 8; transform++) {
    if (constrainedFootprint(anchor, transform as TransformIndex)) expected.push({
      anchor, transform: transform as TransformIndex, strategy: 'constrained', id: 'constrained:' + anchor.x + ':' + anchor.y + ':' + transform });
  }
  expect(result.checkpoint.candidates).toEqual(expected);
  expect(attempts).toBe(888 + 36 * 8);
  expect(result.source.count).toBe(expected.length);
  const point = result.source.at(0); point.anchor.x = 0;
  expect(result.source.at(0).anchor.x).toBe(25);
  expect(enumeratePlanningCandidates(options, result.checkpoint, 10)).toMatchObject({ done: true, attempts: 0 });
});
test('coordinator consumes the complete enumerated source rather than a first-fit subset', () => {
  const enumerated = enumeratePlanningCandidates(options, undefined, 2000);
  if (!enumerated.done) throw new Error('Missing candidate source');
  const visited: string[] = [];
  const result = advancePlanningJob({ observation: 'obs', policy: 'policy', baseRevision: 0,
    source: enumerated.source, weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
    minimumImprovement: 0, validate: () => true,
    step: candidate => { visited.push(candidate.id); return { status: 'rejected', reason: 'fixture-rejection' }; },
  }, undefined, 2000);
  expect(result).toMatchObject({ done: true, reason: 'no-valid-candidate' });
  expect(visited).toEqual(enumerated.checkpoint.candidates.map(candidate => candidate.id));
  expect(visited.length).toBeGreaterThan(1000);
});
test('changed options reject restoration and disabled strategies contribute no candidates', () => {
  const first = enumeratePlanningCandidates(options, undefined, 1);
  expect(() => enumeratePlanningCandidates({ standard: options.standard }, first.checkpoint, 1)).toThrow('Stale');
  expect(enumeratePlanningCandidates({}, undefined, 0)).toMatchObject({ done: true, attempts: 0, source: { count: 0 } });
  const compact = enumeratePlanningCandidates({ constrained: { ...options.constrained, limit: 1 } }, undefined, 8);
  expect(compact).toMatchObject({ done: true, attempts: 8, source: { count: 8 } });
});
test('guard yields without advancement or mutating the saved enumeration', () => {
  const first = enumeratePlanningCandidates(options, undefined, 1);
  const saved = JSON.stringify(first.checkpoint);
  expect(enumeratePlanningCandidates(options, first.checkpoint, 2000, () => false))
    .toMatchObject({ done: false, attempts: 0 });
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
});
