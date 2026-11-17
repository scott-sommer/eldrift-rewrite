import { expect, test } from 'vitest';
import { defenseOperations, towerPower } from '../../src/capabilities/planning/defense-operations';
const tower = { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 };
function input() {
  return { barriers: [{ type: 'rampart', position: { x: 25, y: 25 } },
    { type: 'constructedWall', position: { x: 26, y: 25 } }],
    towers: [{ x: 25, y: 20 }], gates: [{ x: 25, y: 25 }],
    repairReachable: Array<boolean>(2500).fill(true), friendlyReachable: Array<boolean>(2500).fill(true),
    rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
    tower, minimumTowerPower: 500 };
}
test('nominal tower coverage uses Chebyshev range, linear falloff and floor', () => {
  const origin = { x: 20, y: 20 };
  expect(towerPower(origin, { x: 25, y: 25 }, tower)).toBe(600);
  expect(towerPower(origin, { x: 30, y: 30 }, tower)).toBe(450);
  expect(towerPower(origin, { x: 49, y: 49 }, tower)).toBe(150);
});
test('upkeep counts ramparts while access and tower deficits remain explicit', () => {
  const request = input();
  request.repairReachable[25 * 50 + 26] = false;
  request.friendlyReachable[25 * 50 + 25] = false;
  request.towers = [];
  const result = defenseOperations(request);
  expect(result.upkeepEnergyPerTick).toBe(0.03);
  expect(result.unreachableRepair).toEqual([{ x: 26, y: 25 }]);
  expect(result.blockedGates).toEqual([{ x: 25, y: 25 }]);
  expect(result.undercovered).toHaveLength(2);
  expect(defenseOperations(input()).undercovered).toEqual([]);
});
test('invalid masks, nonfinite costs and degenerate intervals reject scoring', () => {
  expect(() => defenseOperations({ ...input(), repairReachable: [] })).toThrow('mask');
  expect(() => defenseOperations({ ...input(), rampartDecayTicks: 0 })).toThrow('intervals');
  expect(() => defenseOperations({ ...input(), minimumTowerPower: NaN })).toThrow('costs');
});
