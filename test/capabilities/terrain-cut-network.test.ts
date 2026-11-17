import { expect, test } from 'vitest';
import { createTerrainCutNetwork } from '../../src/capabilities/planning/terrain-cut-network';
function corridor() {
  const walkable = Array<boolean>(2500).fill(false), barrierCosts = Array<number | null>(2500).fill(null);
  for (let x = 0; x <= 10; x++) { walkable[25 * 50 + x] = true; barrierCosts[25 * 50 + x] = 10; }
  barrierCosts[25 * 50 + 5] = 1;
  return { walkable, barrierCosts, entries: [{ x: 0, y: 25 }], protectedTiles: [{ x: 10, y: 25 }] };
}
test('terrain cut finds the cheapest legal choke and resumes augmentation batches', () => {
  const request = corridor(), network = createTerrainCutNetwork(request);
  expect(network.advance(0)).toMatchObject({ status: 'pending' });
  expect(network.advance(10)).toEqual({ status: 'complete', cost: 1, barriers: [{ x: 5, y: 25 }] });
});
test('uncuttable paths reject while natural separation requires no barriers', () => {
  const request = corridor();
  request.barrierCosts.fill(null);
  expect(createTerrainCutNetwork(request).advance(10)).toMatchObject({ status: 'rejected', reason: 'no-legal-cut' });
  request.walkable[25 * 50 + 5] = false;
  expect(createTerrainCutNetwork(request).advance(10)).toEqual({ status: 'complete', cost: 0, barriers: [] });
});
test('terminal cuts are forbidden and invalid costs fail explicitly', () => {
  const request = corridor();
  request.barrierCosts.fill(null);
  request.barrierCosts[25 * 50] = 1;
  expect(createTerrainCutNetwork(request).advance(10).status).toBe('rejected');
  request.barrierCosts[0] = -1;
  expect(() => createTerrainCutNetwork(request)).toThrow('cost');
});
