import { expect, test } from 'vitest';
import { barrierCost } from '../../src/capabilities/planning/barrier-cost';
import type { BarrierCostInput } from '../../src/capabilities/planning/barrier-cost';
function input(): BarrierCostInput {
  const barriers = [];
  for (let y = 19; y <= 21; y++) for (let x = 19; x <= 21; x++) {
    if (x !== 20 || y !== 20) barriers.push({ type: 'rampart', position: { x, y } });
  }
  return { observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
    barriers, protectedAssets: [{ type: 'spawn', position: { x: 20, y: 20 } }],
    costs: { rampart: 1, constructedWall: 2 } };
}
test('intact barrier separates the protected asset and returns explicit tile cost', () => {
  expect(barrierCost(input())).toEqual({ ok: true, cost: 8, barrierTiles: 8, protectedAssets: 1 });
});
test('one diagonal gap exposes the asset to room exits', () => {
  const request = input();
  expect(barrierCost({ ...request, barriers: request.barriers.slice(1) }))
    .toEqual({ ok: false, reason: 'exposed', details: ['spawn:1020'] });
});
test('natural walls can close a gap without receiving barrier construction cost', () => {
  const request = input(), terrain = [...request.observation.terrain];
  terrain[19 * 50 + 19] = 'wall';
  expect(barrierCost({ ...request, observation: { ...request.observation, terrain }, barriers: request.barriers.slice(1) }))
    .toMatchObject({ ok: true, cost: 7 });
});
test('rampart overlays protect assets while walls cannot overlap them', () => {
  const request = input();
  expect(barrierCost({ ...request, barriers: [{ type: 'rampart', position: { x: 20, y: 20 } }] }))
    .toMatchObject({ ok: true, cost: 1 });
  expect(barrierCost({ ...request, barriers: [{ type: 'constructedWall', position: { x: 20, y: 20 } }] }))
    .toMatchObject({ ok: false, reason: 'placement' });
});
test('invalid barrier types, duplicated tiles and absent assets fail explicitly', () => {
  const request = input();
  expect(() => barrierCost({ ...request, barriers: [...request.barriers, request.barriers[0]!] })).toThrow('Duplicate');
  expect(() => barrierCost({ ...request, protectedAssets: [] })).toThrow('Missing');
  expect(() => barrierCost({ ...request, barriers: [{ type: 'road', position: { x: 19, y: 19 } }] })).toThrow('type');
});

test('barriers cannot consume manually reserved clearance tiles', () => {
  const request = input();
  request.observation = { ...request.observation,
    constraints: [{ id: 'corridor', kind: 'keep-clear', position: { x: 19, y: 19 } }] };
  expect(barrierCost(request)).toEqual({ ok: false, reason: 'constraints',
    details: [{ id: 'corridor', reason: 'occupied-clearance' }] });
});
