import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { runPersistentMigration } from '../../src/persistence/migrations/persistent-batch';
import { openState } from '../../src/persistence/versioned-state';
import type { StateSchema } from '../../src/persistence/versioned-state';

const schema: StateSchema<{ count: number }> = {
  owner: 'fixture', version: 2, initial: () => ({ count: 0 }),
  migrations: { 1: value => ({ count: (value as { oldCount: number }).oldCount }) },
  valid: (value): value is { count: number } => typeof value === 'object' && value !== null && 'count' in value && typeof value.count === 'number',
};
test('real Memory adapter resumes record migrations after serialization and rejects changed manifests', () => {
  let memory = {};
  let port = createMemoryPort(() => memory);
  for (const key of ['fixture/a', 'fixture/b']) port.write(key, { owner: 'fixture', version: 1, data: { oldCount: 7 } });
  const plan = { id: 'fixture-v2', keys: ['fixture/a', 'fixture/b'], migrate: (key: string) => { openState(port, key, schema); } };
  expect(runPersistentMigration(port, plan, 1, () => true).next).toBe(1);
  memory = JSON.parse(JSON.stringify(memory));
  port = createMemoryPort(() => memory);
  expect(() => runPersistentMigration(port, { ...plan, keys: [...plan.keys].reverse() }, 1, () => true)).toThrow('invalid state');
  expect(runPersistentMigration(port, plan, 1, () => true).complete).toBe(true);
  expect(runPersistentMigration(port, plan, 1, () => true).processed).toBe(0);
  expect(openState(port, 'fixture/b', schema)).toEqual({ count: 7 });
});

test('a failed record never advances the durable checkpoint', () => {
  const port = createMemoryPort(() => (memory));
  const memory = {};
  const plan = { id: 'failed', keys: ['fixture/a'], migrate: () => { throw new Error('record failure'); } };
  expect(() => runPersistentMigration(port, plan, 1, () => true)).toThrow('record failure');
  expect(port.read('migrations/failed')).toMatchObject({ data: { next: 0 } });
});
