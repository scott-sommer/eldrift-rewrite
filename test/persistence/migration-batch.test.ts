import { expect, test } from 'vitest';
import { runMigrationBatch } from '../../src/persistence/migration-batch';
import type { MigrationProgress } from '../../src/persistence/migration-batch';

test('record limit and CPU admission bound batches, with durable reset continuation', () => {
  let saved: MigrationProgress | undefined;
  const seen: string[] = [];
  const port = { read: () => saved, write: (value: MigrationProgress) => { saved = JSON.parse(JSON.stringify(value)); } };
  const plan = { id: 'intel-v2-fixed-manifest', keys: ['a', 'b', 'c'], migrate: (key: string) => { seen.push(key); } };
  expect(runMigrationBatch(plan, port, 1, () => true)).toEqual({ processed: 1, next: 1, complete: false });
  expect(runMigrationBatch(plan, port, 10, () => false).processed).toBe(0);
  expect(runMigrationBatch({ ...plan }, { ...port }, 10, () => true).complete).toBe(true);
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(runMigrationBatch(plan, port, 10, () => true).processed).toBe(0);
});

test('failed record retains its cursor and can be retried without skipping it', () => {
  let saved: MigrationProgress | undefined;
  let fail = true;
  const port = { read: () => saved, write: (value: MigrationProgress) => { saved = value; } };
  const completed = new Set<string>();
  const plan = { id: 'v2', keys: ['a', 'b'], migrate: (key: string) => { if (key === 'b' && fail) throw new Error('corrupt'); completed.add(key); } };
  expect(() => runMigrationBatch(plan, port, 2, () => true)).toThrow('corrupt');
  expect(saved?.next).toBe(1);
  fail = false;
  expect(runMigrationBatch(plan, port, 2, () => true).complete).toBe(true);
  expect([...completed]).toEqual(['a', 'b']);
});

test('unknown plan and corrupt cursor never invoke migration', () => {
  for (const state of [{ plan: 'other', next: 0 }, { plan: 'v2', next: -1 }, { plan: 'v2', next: 4 }]) {
    let invoked = false;
    expect(() => runMigrationBatch({ id: 'v2', keys: ['a'], migrate: () => { invoked = true; } }, { read: () => state, write: () => {} }, 1, () => true)).toThrow();
    expect(invoked).toBe(false);
  }
});
