import { expect, test } from 'vitest';
import { planningRoadCosts } from '../../src/capabilities/planning/road-costs';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
const blocks = (type: string) => !['road', 'container', 'rampart'].includes(type);
test('composed costs preserve swamps and all blockers despite preferred roads', () => {
  const terrain = Array<TerrainCell>(2500).fill('plain');
  terrain[510] = 'swamp'; terrain[511] = 'wall';
  const assessment = assessRoom({ terrain, costs: { plain: 2, swamp: 10 },
    objects: [{ id: 's', kind: 'source', position: { x: 12, y: 10 } }],
    infrastructure: [{ id: 'tower', type: 'tower', position: { x: 13, y: 10 }, owned: true, walkable: false }],
    constraints: [{ id: 'clear', kind: 'keep-clear', position: { x: 14, y: 10 } },
      { id: 'site', kind: 'locked', type: 'spawn', position: { x: 15, y: 10 } }] });
  const roads = [11, 12, 13, 14, 15, 16].map(x => ({ type: 'road', position: { x, y: 10 } }));
  const costs = planningRoadCosts(assessment, [...roads, { type: 'lab', position: { x: 16, y: 10 } }],
    [{ x: 17, y: 10 }], blocks);
  expect(costs.slice(510, 518)).toEqual([10, 255, 255, 255, 255, 255, 255, 1]);
  expect(costs[518]).toBe(2);
  expect(assessment.terrain.costs[517]).toBe(2);
});
test('planned overlays are order independent and permit walkable containers', () => {
  const assessment = assessRoom({ terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] });
  const placements = [{ type: 'road', position: { x: 25, y: 25 } }, { type: 'lab', position: { x: 25, y: 25 } },
    { type: 'container', position: { x: 26, y: 25 } }];
  const result = planningRoadCosts(assessment, placements, [], blocks);
  expect(result[1275]).toBe(255);
  expect(result[1276]).toBe(1);
  expect(planningRoadCosts(assessment, placements.reverse(), [], blocks)).toEqual(result);
});
