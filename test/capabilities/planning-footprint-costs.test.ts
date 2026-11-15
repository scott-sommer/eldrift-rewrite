import { expect, test } from 'vitest';
import { footprintCosts } from '../../src/capabilities/planning/footprint-costs';
import type { FootprintCostInput } from '../../src/capabilities/planning/footprint-costs';
function input(): FootprintCostInput {
  const terrain = Array(2500).fill('plain');
  terrain[510] = 'swamp';
  return { entries: [{ type: 'spawn', position: { x: 10, y: 10 } },
    { type: 'road', position: { x: 10, y: 10 } }, { type: 'extension', position: { x: 11, y: 10 } }],
    observation: { terrain, objects: [], constraints: [], infrastructure: [
      { id: 'spawn', type: 'spawn', position: { x: 10, y: 10 }, owned: true, walkable: false },
      { id: 'old', type: 'tower', position: { x: 20, y: 20 }, owned: true, walkable: false },
      { id: 'enemy', type: 'tower', position: { x: 21, y: 20 }, owned: false, walkable: false },
    ] }, desiredCapacity: { spawn: 1, extension: 3, lab: 10 },
    constructionCost: { road: 300, extension: 3000 }, retirementCost: { tower: 5000 } };
}
test('reports shared swamp tiles once and capacity shortages by structure type', () => {
  expect(footprintCosts(input())).toMatchObject({ swamps: 1, swampTiles: [510], capacityShortfall: 12,
    shortfalls: [{ type: 'spawn', missing: 0 }, { type: 'extension', missing: 2 }, { type: 'lab', missing: 10 }] });
});
test('reused structures cost no construction and only owned unretained assets receive retirement cost', () => {
  const request = input(), before = JSON.stringify(request);
  expect(footprintCosts(request)).toMatchObject({ construction: 3300, retirement: 5000, migration: 8300,
    additions: ['extension:511', 'road:510'], unretained: ['old'] });
  expect(JSON.stringify(request)).toBe(before);
});
test('unknown weights and malformed or duplicated inputs cannot silently produce a cheap score', () => {
  const request = input();
  expect(() => footprintCosts({ ...request, constructionCost: {} })).toThrow('weight');
  expect(() => footprintCosts({ ...request, desiredCapacity: { lab: -1 } })).toThrow('capacity');
  expect(() => footprintCosts({ ...request, entries: [...request.entries, request.entries[0]!] })).toThrow('Duplicate');
  expect(() => footprintCosts({ ...request, retirementCost: { tower: Infinity } })).toThrow('weight');
});
test('inventory scoring is order-independent', () => {
  const request = input();
  expect(footprintCosts({ ...request, entries: [...request.entries].reverse() })).toEqual(footprintCosts(request));
});

test('controllers are fixed objects, and hostile owned-type structures are not reusable assets', () => {
  const request = input();
  request.observation = { ...request.observation,
    objects: [{ id: 'controller', kind: 'controller', position: { x: 30, y: 30 } }],
    infrastructure: [...request.observation.infrastructure,
      { id: 'controller', type: 'controller', position: { x: 30, y: 30 }, owned: true, walkable: true }] };
  request.entries = [...request.entries, { type: 'tower', position: { x: 21, y: 20 } }];
  request.constructionCost = { ...request.constructionCost, tower: 5000 };
  expect(footprintCosts(request)).toMatchObject({ construction: 8300, unretained: ['old'] });
});
