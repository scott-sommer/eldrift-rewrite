import { expect, test, vi } from 'vitest';
import { evaluateDraft } from '../../src/capabilities/planning/evaluate-draft';
import type { EvaluateDraftInput } from '../../src/capabilities/planning/evaluate-draft';
function input(): EvaluateDraftInput {
  return { entries: [{ type: 'spawn', position: { x: 20, y: 20 }, rcl: 1 },
      { type: 'rampart', position: { x: 20, y: 20 }, rcl: 4 }],
    storage: { x: 19, y: 20 }, observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
    limits: { spawn: [0, 1, 1, 1, 1, 1, 1, 1, 1], rampart: [0, 0, 0, 0, 1, 1, 1, 1, 1] },
    hauling: [], serviceWeights: { spawn: 8 }, protectedTypes: ['spawn'],
    desiredCapacity: { spawn: 1, extension: 60 }, constructionCost: { spawn: 15000, rampart: 1 }, retirementCost: {},
    barrierCosts: { rampart: 1, constructedWall: 1 }, blocksMovement: type => type === 'spawn',
    search: vi.fn(() => vi.fn(() => ({ path: [], incomplete: false, cost: 0 }))) };
}
test('returns all six dimensions and traceable breakdowns for one validated draft', () => {
  expect(evaluateDraft(input())).toMatchObject({ ok: true, costs: {
    hauling: 0, service: 0, capacityShortfall: 60, swamps: 0, defense: 1, migration: 15001,
  }, breakdown: { defense: { barrierTiles: 1 }, routes: { service: { routes: [{ id: 'spawn:1020' }] } } } });
});
test('hard capacity validation precedes path measurements', () => {
  const request = input();
  request.entries = [...request.entries, { type: 'spawn', position: { x: 22, y: 20 }, rcl: 1 }];
  expect(evaluateDraft(request)).toMatchObject({ ok: false, phase: 'capacity' });
  expect(request.search).not.toHaveBeenCalled();
});
test('unprotected assets do not receive scores or trigger route measurement', () => {
  const request = input();
  request.entries = request.entries.filter(entry => entry.type !== 'rampart');
  expect(evaluateDraft(request)).toMatchObject({ ok: false, phase: 'defense' });
  expect(request.search).not.toHaveBeenCalled();
});
