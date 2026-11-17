import { expect, test } from 'vitest';
import { prepareDefensePlan } from '../../src/features/planning/defense-plan-setup';
import { defenseAssetInventory } from '../../src/features/planning/defense-asset-inventory';
import { planningObservation } from '../fixtures/planning-observation';
const candidate = { id: 'custom', strategy: 'custom', anchor: { x: 25, y: 25 }, transform: 0 as const };
const entries = [{ type: 'storage', position: { x: 25, y: 25 }, rcl: 4 },
  { type: 'road', position: { x: 24, y: 25 }, rcl: 2 }];
const policy = { valuableTypes: ['storage', 'spawn'], rcl: 6, costs: { rampart: 1, constructedWall: 1 },
  repairRange: 3, blocksMovement: (type: string) => ['storage', 'spawn'].includes(type),
  operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
    minimumTowerPower: 0, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } };
test('inventory accounts for every planned, observed and fixed asset with controller access required', () => {
  const observation = planningObservation();
  observation.infrastructure = [
    { id: 'spawn', type: 'spawn', position: { x: 20, y: 20 }, walkable: false, owned: true },
    { id: 'road', type: 'road', position: { x: 10, y: 20 }, walkable: true, owned: true }];
  const inventory = defenseAssetInventory(observation, entries, policy.valuableTypes);
  expect(inventory.protection.assets).toHaveLength(entries.length + observation.infrastructure.length + observation.objects.length + 8);
  expect(inventory.protectedAssets.map(entry => entry.type)).toEqual(['storage', 'spawn']);
  expect(inventory.protection.exemptions.map(item => item.id)).toEqual(expect.arrayContaining(['plan:road:1274', 'observed:road', 'object:s1', 'object:s2', 'object:m']));
  expect(inventory.protection.exemptions.some(item => item.id.includes('controller'))).toBe(false);
  expect(inventory.protectedTiles).toContainEqual({ x: 39, y: 39 });
  expect(inventory.protectedTiles).toContainEqual({ x: 40, y: 40 });
});
test('plan setup detaches inputs and chooses traversable service origins beside a blocked anchor', () => {
  const observation = planningObservation();
  const result = prepareDefensePlan(candidate, entries, observation, policy);
  expect(result.input.origins).toHaveLength(8);
  expect(result.input.origins).not.toContainEqual(candidate.anchor);
  expect(result.fallback.bounds).toEqual({ minX: 25, maxX: 25, minY: 25, maxY: 25 });
  expect(result.fallback.controller).toEqual({ x: 40, y: 40 });
  observation.terrain = Array(2500).fill('wall');
  expect(result.generation.observation.terrain[0]).toBe('plain');
  expect(result.generation.rcl).toBe(6);
});
test('setup rejects a plan without a service origin or valuable asset', () => {
  const observation = planningObservation();
  observation.constraints = Array.from({ length: 8 }, (_, i) => {
    const tiles = [{ x: 24, y: 24 }, { x: 25, y: 24 }, { x: 26, y: 24 }, { x: 24, y: 25 },
      { x: 26, y: 25 }, { x: 24, y: 26 }, { x: 25, y: 26 }, { x: 26, y: 26 }];
    return { id: String(i), kind: 'blocked' as const, position: tiles[i]! };
  });
  expect(() => prepareDefensePlan(candidate, entries, observation, policy)).toThrow('service origin');
  expect(() => defenseAssetInventory(planningObservation(), [], policy.valuableTypes)).toThrow('valuable');
});
