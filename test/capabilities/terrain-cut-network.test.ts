import { defenseSeparation } from '../../src/capabilities/planning/defense-separation';
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

test('caller mutation and returned barrier mutation cannot corrupt a pending or completed cut', () => {
  const request = corridor(), network = createTerrainCutNetwork(request);
  network.advance(1);
  request.walkable.fill(false); request.barrierCosts.fill(null); request.entries[0]!.x = 49;
  const result = network.advance(10);
  expect(result).toEqual({ status: 'complete', cost: 1, barriers: [{ x: 5, y: 25 }] });
  if (result.status !== 'complete') throw new Error('Expected cut');
  result.barriers[0]!.x = 0;
  expect(network.advance(10)).toEqual({ status: 'complete', cost: 1, barriers: [{ x: 5, y: 25 }] });
});
test('weighted cuts match exhaustive separation search on a diagonal two-route chamber', () => {
  const walkable = Array<boolean>(2500).fill(false), barrierCosts = Array<number | null>(2500).fill(null);
  const cells = [{ x: 10, y: 10 }, { x: 11, y: 9 }, { x: 11, y: 11 }, { x: 12, y: 10 }];
  for (const tile of cells) walkable[tile.y * 50 + tile.x] = true;
  barrierCosts[9 * 50 + 11] = 2; barrierCosts[11 * 50 + 11] = 3;
  const request = { walkable, barrierCosts, entries: [cells[0]!], protectedTiles: [cells[3]!] };
  const terrain = walkable.map(open => open ? 'plain' as const : 'wall' as const);
  let minimum = Infinity;
  for (let bits = 0; bits < 4; bits++) {
    const barriers = [cells[1]!, cells[2]!].filter((_, index) => bits & (1 << index));
    const separated = defenseSeparation({ terrain, entries: request.entries, barriers,
      assets: [{ id: 'core', position: cells[3]! }] }).separated;
    if (separated) minimum = Math.min(minimum, barriers.reduce((sum, tile) => sum + barrierCosts[tile.y * 50 + tile.x]!, 0));
  }
  const result = createTerrainCutNetwork(request).advance(10);
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected cut');
  expect(result.cost).toBe(minimum);
  expect(result.cost).toBe(5);
  expect(defenseSeparation({ terrain, entries: request.entries, barriers: result.barriers,
    assets: [{ id: 'core', position: cells[3]! }] }).separated).toBe(true);
});

test('serialized terrain flow checkpoints resume through deterministic bounded reconstruction', () => {
  const request = corridor(), first = createTerrainCutNetwork(request).advance(1);
  expect(first.status).toBe('pending');
  if (first.status !== 'pending' || !first.checkpoint) throw new Error('Expected flow checkpoint');
  const saved = JSON.parse(JSON.stringify(first.checkpoint));
  const restored = createTerrainCutNetwork(request, saved);
  let result = restored.advance(1, () => true, 5);
  for (let calls = 0; result.status === 'pending' && calls < 1000; calls++) result = restored.advance(1, () => true, 5);
  expect(result).toEqual({ status: 'complete', cost: 1, barriers: [{ x: 5, y: 25 }] });
});

test('compact graph recipe invalidates changed terrain costs and terminals', () => {
  const request = corridor(), result = createTerrainCutNetwork(request).advance(1);
  if (result.status !== 'pending' || !result.checkpoint) throw new Error('Expected checkpoint');
  expect(JSON.stringify(result.checkpoint).length).toBeLessThan(4000);
  request.barrierCosts[25 * 50 + 5] = 2;
  expect(() => createTerrainCutNetwork(request, result.checkpoint).advance(100)).toThrow('Stale');
});
