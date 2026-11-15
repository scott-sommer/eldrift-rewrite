import { standardTemplate } from '../../src/capabilities/planning/standard-template';
import { placeTemplate } from '../../src/capabilities/planning/template';
import { expect, test } from 'vitest';
import captured from '../fixtures/legacy-perimeter.json';
import { perimeterDefense } from '../../src/capabilities/planning/perimeter-defense';
import type { PerimeterDefenseInput } from '../../src/capabilities/planning/perimeter-defense';
import type { StagedTile } from '../../src/capabilities/planning/template';
import { applyLegacyPerimeterDefense } from '../../src/features/planning/legacy-perimeter-defense';
import { planningObservation } from '../fixtures/planning-observation';
import { barrierCost } from '../../src/capabilities/planning/barrier-cost';
const fixture = captured as {
  cases: { name: string; bounds: PerimeterDefenseInput['bounds']; controller?: { x: number; y: number }; walls: string[]; expected: StagedTile[] }[];
};
test.each(fixture.cases)('matches captured legacy geometry, ordering and staging: $name', item => {
  const walls = new Set(item.walls);
  const terrain = Array.from({ length: 2500 }, (_, index) => walls.has(index % 50 + ':' + Math.floor(index / 50)) ? 'wall' as const : 'plain' as const);
  expect(perimeterDefense({ bounds: item.bounds, terrain, ...(item.controller ? { controller: item.controller } : {}) })).toEqual(item.expected);
});
test('fallback encloses core and controller while preserving an existing operator rampart', () => {
  const observation = planningObservation();
  const candidate = { id: 'constrained:25:25:0', strategy: 'constrained', anchor: { x: 25, y: 25 }, transform: 0 as const };
  const entries = [{ type: 'storage', position: { x: 25, y: 25 }, rcl: 4 },
    { type: 'rampart', position: { x: 21, y: 21 }, rcl: 3, priority: -999, tag: 'manual' }];
  const defended = applyLegacyPerimeterDefense(candidate, entries, observation);
  expect(defended.filter(entry => entry.type === 'rampart' && entry.position.x === 21 && entry.position.y === 21)).toEqual([entries[1]]);
  const barriers = defended.filter(entry => entry.type === 'rampart');
  expect(barrierCost({ observation, barriers, protectedAssets: [entries[0]!], costs: { rampart: 1, constructedWall: 1 } }).ok).toBe(true);
  expect(barrierCost({ observation, barriers: barriers.filter(entry => entry.position.x !== 21 || entry.position.y !== 21),
    protectedAssets: [entries[0]!], costs: { rampart: 1, constructedWall: 1 } }).ok).toBe(false);
  expect(entries).toHaveLength(2);
});
test('invalid bounds and staging are rejected before geometry generation', () => {
  const input = { bounds: { minX: 20, maxX: 30, minY: 20, maxY: 30 }, terrain: planningObservation().terrain };
  expect(() => perimeterDefense({ ...input, padding: -1 })).toThrow('padding');
  expect(() => perimeterDefense({ ...input, rcl: 1 })).toThrow('RCL');
  expect(() => perimeterDefense({ ...input, bounds: { ...input.bounds, minX: 31 } })).toThrow('bounds');
});

test.each([0, 1, 2, 3, 4, 5, 6, 7] as const)('standard transform %s remains inside the generated fallback', transform => {
  const observation = planningObservation(), anchor = { x: 25, y: 25 };
  const core = placeTemplate(standardTemplate, anchor, transform)!.map(entry => ({ ...entry, rcl: 4 }));
  const entries = applyLegacyPerimeterDefense({ id: 'standard', strategy: 'standard', anchor, transform }, core, observation);
  const result = barrierCost({ observation, barriers: entries.filter(entry => entry.type === 'rampart'),
    protectedAssets: core.filter(entry => entry.type !== 'road'), costs: { rampart: 1, constructedWall: 1 } });
  expect(result.ok).toBe(true);
});
