import { expect, test } from 'vitest';
import { createSpawnExecutor } from '../../src/capabilities/spawning/execute';
import type { SpawnAssignment } from '../../src/capabilities/spawning/request';
const assignment = (id: string): SpawnAssignment => ({
  spawn: id, cost: 50, request: { id, name: id, owner: 'economy', room: 'W0N0',
    priority: 1, readyAt: 0, expiresAt: 10, body: ['move'] },
});
test('accepted, rejected and uncertain results are distinct and do not abort other spawns', () => {
  let tick = 1;
  const calls: string[] = [];
  const executor = createSpawnExecutor({ clock: () => tick, invoke: item => {
    calls.push(item.spawn);
    if (item.spawn === 'c') throw new Error('uncertain');
    return item.spawn === 'a' ? 0 : -6;
  } });
  const batch = [assignment('a'), assignment('b'), assignment('c'), assignment('d')];
  const receipts = executor.execute(batch);
  expect(receipts.map(receipt => receipt.status)).toEqual(['accepted', 'rejected', 'uncertain', 'rejected']);
  expect(executor.execute(batch)).toBe(receipts);
  expect(calls).toHaveLength(4);
  tick++;
  executor.execute([assignment('b')]);
  expect(calls).toHaveLength(5);
});
test('callback re-entry cannot issue a second batch and duplicate allocation fails before effects', () => {
  let calls = 0;
  const executor = createSpawnExecutor({ clock: () => 1, invoke: () => {
    calls++;
    executor.execute([assignment('other')]);
    return 0;
  } });
  expect(() => executor.execute([assignment('a'), assignment('a')])).toThrow('Duplicate');
  expect(calls).toBe(0);
  executor.execute([assignment('a')]);
  expect(calls).toBe(1);
});
