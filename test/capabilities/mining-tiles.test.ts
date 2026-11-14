import { expect, test } from 'vitest';
import { rankMiningTiles } from '../../src/capabilities/mining/rank-tiles';
const tile = (x: number, y: number) => ({ room: 'W0N0', x, y });
test('mining tile ranking prefers container occupancy and reachable link handoff without mutating input', () => {
  const access = [tile(19, 19), tile(21, 20), tile(20, 21)];
  const before = structuredClone(access);
  expect(rankMiningTiles(access, { container: tile(20, 21), link: tile(22, 20) }))
    .toEqual([tile(20, 21), tile(21, 20), tile(19, 19)]);
  expect(access).toEqual(before);
});
test('ranking is deterministic and ignores infrastructure in another room', () => {
  const access = [tile(21, 20), tile(19, 19)];
  expect(rankMiningTiles(access, { link: { room: 'E0N0', x: 22, y: 20 } }))
    .toEqual(rankMiningTiles([...access].reverse(), {}));
});
