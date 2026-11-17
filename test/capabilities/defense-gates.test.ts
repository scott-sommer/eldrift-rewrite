import { expect, test } from 'vitest';
import { defenseGates } from '../../src/capabilities/planning/defense-gates';
import { evaluateDefenseCandidate } from '../../src/capabilities/planning/defense-candidate';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
test('road crossings and explicit gate requirements are detached, deduplicated and ordered', () => {
  const position = { x: 20, y: 25 }, required = [{ x: 10, y: 25 }, position];
  const result = defenseGates([{ type: 'road', position }, { type: 'storage', position: { x: 21, y: 25 } }],
    [{ type: 'rampart', position }, { type: 'rampart', position: { x: 21, y: 25 } }], required);
  expect(result).toEqual([{ x: 10, y: 25 }, position]);
  position.x = 0;
  expect(result[1]?.x).toBe(20);
});
test('shared evaluation accounts for friendly access at generated road crossings', () => {
  const terrain: TerrainCell[] = Array.from({ length: 2500 }, (_, index) =>
    Math.floor(index / 50) === 25 && index % 50 <= 30 ? 'plain' : 'wall');
  const storage = { type: 'storage', position: { x: 25, y: 25 } }, crossing = { x: 20, y: 25 };
  const input = { observation: { terrain, objects: [], infrastructure: [], constraints: [] },
    placements: [storage, { type: 'road', position: crossing }], protectedAssets: [storage],
    costs: { rampart: 1, constructedWall: 1 }, origins: [{ x: 19, y: 25 }], gates: [], repairRange: 3,
    blocksMovement: (type: string) => ['storage', 'constructedWall'].includes(type),
    operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
      minimumTowerPower: 0, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } };
  const rampart = evaluateDefenseCandidate({ ...input, barriers: [{ type: 'rampart', position: crossing }] });
  expect(rampart.ok).toBe(true);
  if (!rampart.ok) throw new Error('Expected valid rampart');
  expect(rampart.operations.blockedGates).toEqual([]);
  const wall = evaluateDefenseCandidate({ ...input, barriers: [{ type: 'constructedWall', position: crossing }] });
  expect(wall.ok).toBe(true);
  if (!wall.ok) throw new Error('Expected evaluated wall candidate');
  expect(wall.operations.blockedGates).toEqual([crossing]);
});
