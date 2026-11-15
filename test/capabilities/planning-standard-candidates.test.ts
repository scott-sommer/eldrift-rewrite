import { expect, test } from 'vitest';
import { standardCandidates } from '../../src/capabilities/planning/standard-candidates';
import { placeTemplate } from '../../src/capabilities/planning/template';
import { standardTemplate } from '../../src/capabilities/planning/standard-template';
test('empty-room seeds enumerate all 110 central anchors and eight transforms without first-fit selection', () => {
  const candidates = standardCandidates({ structures: [] });
  expect(candidates).toHaveLength(880);
  expect(candidates[0]).toEqual({ anchor: { x: 16, y: 12 }, transform: 0 });
  expect(new Set(candidates.map(item => JSON.stringify(item))).size).toBe(candidates.length);
});
test('previous placement leads, storage deduplicates and returned anchors are independent', () => {
  const previous = { anchor: { x: 25, y: 25 }, transform: 3 as const };
  const candidates = standardCandidates({ previous, storage: previous.anchor, structures: [] });
  expect(candidates[0]).toEqual(previous);
  expect(candidates.filter(item => item.anchor.x === 25 && item.anchor.y === 25)).toHaveLength(8);
  candidates[0]!.anchor.x = 0;
  expect(previous.anchor.x).toBe(25);
});
test('preserved spawn produces aligned noncentral candidates and out-of-bounds seeds cannot leak partial plans', () => {
  const position = { x: 21, y: 23 };
  const candidates = standardCandidates({ storage: { x: 1, y: 1 }, structures: [{ type: 'spawn', position }] });
  expect(candidates.some(candidate => placeTemplate(standardTemplate, candidate.anchor, candidate.transform)!
    .some(entry => entry.type === 'spawn' && entry.position.x === position.x && entry.position.y === position.y))).toBe(true);
  expect(candidates.every(candidate => placeTemplate(standardTemplate, candidate.anchor, candidate.transform))).toBe(true);
});
