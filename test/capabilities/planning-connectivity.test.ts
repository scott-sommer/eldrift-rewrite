import { expect, test } from 'vitest';
import { layoutConnectivity } from '../../src/capabilities/planning/connectivity';
const blocks = (type: string) => type !== 'road' && type !== 'container' && type !== 'rampart';
test('a road beneath a planned lab cannot bridge two otherwise disconnected service regions', () => {
  const mask = Array<boolean>(2500).fill(false);
  for (let x = 20; x <= 30; x++) mask[25 * 50 + x] = true;
  const requirements = [{ id: 'storage-access', positions: [{ x: 20, y: 25 }] },
    { id: 'spawn-egress', positions: [{ x: 30, y: 25 }] }];
  expect(layoutConnectivity(mask, [], blocks, requirements).connected).toBe(true);
  const road = { type: 'road', position: { x: 25, y: 25 } };
  const lab = { type: 'lab', position: { x: 25, y: 25 } };
  for (const placements of [[road, lab], [lab, road]]) {
    expect(layoutConnectivity(mask, placements, blocks, requirements))
      .toEqual({ connected: false, commonRegions: [], inaccessible: [] });
  }
});
test('multiple possible work positions must share one component rather than independently reachable islands', () => {
  const mask = Array<boolean>(2500).fill(true);
  for (let y = 0; y < 50; y++) mask[y * 50 + 25] = false;
  const requirements = [
    { id: 'storage', positions: [{ x: 24, y: 25 }, { x: 26, y: 25 }] },
    { id: 'source', positions: [{ x: 20, y: 25 }] },
    { id: 'controller', positions: [{ x: 30, y: 25 }] },
  ];
  expect(layoutConnectivity(mask, [], blocks, requirements).connected).toBe(false);
  expect(layoutConnectivity(mask, [], blocks, requirements.slice(0, 2)))
    .toEqual({ connected: true, commonRegions: [0], inaccessible: [] });
});
test('blocked or empty access groups are diagnosed and input masks remain unchanged', () => {
  const mask = Array<boolean>(2500).fill(true);
  const result = layoutConnectivity(mask, [{ type: 'spawn', position: { x: 25, y: 25 } }], blocks, [
    { id: 'blocked', positions: [{ x: 25, y: 25 }] }, { id: 'missing', positions: [] },
  ]);
  expect(result).toEqual({ connected: false, commonRegions: [], inaccessible: ['blocked', 'missing'] });
  expect(mask[25 * 50 + 25]).toBe(true);
  expect(layoutConnectivity(mask, [], blocks, []).connected).toBe(false);
});
