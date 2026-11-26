import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, peekState, saveState } from '../../src/persistence/versioned-state';
import type { StateSchema } from '../../src/persistence/versioned-state';
interface Nested { entries: { amount: number }[] }
const schema: StateSchema<Nested> = { owner: 'test',version: 1,initial: () => ({ entries: [{ amount: 1 }] }),
  migrations: { 0: data => ({ entries: [{ amount: data as number }] }) },
  valid: (value): value is Nested => !!value && typeof value === 'object' && 'entries' in value && Array.isArray(value.entries)
    && value.entries.every(item => !!item && typeof item.amount === 'number' && Number.isFinite(item.amount)) };
test('native detached reads isolate nested edits across reads, writes and reset',() => {
  let root = {}; const port = createMemoryPort(() => root), first = openState(port,'test/home',schema);
  first.entries[0]!.amount = 7;
  expect(peekState(port,'test/home',schema)?.entries[0]?.amount).toBe(1);
  saveState(port,'test/home',schema,first); first.entries[0]!.amount = 99;
  const second = peekState(port,'test/home',schema)!; second.entries.push({ amount: 50 });
  root = JSON.parse(JSON.stringify(root));
  expect(openState(createMemoryPort(() => root),'test/home',schema)).toEqual({ entries: [{ amount: 7 }] });
});
test('detached legacy snapshots migrate without changing stored data until open commits',() => {
  const root = {}, port = createMemoryPort(() => root);
  port.write('test/home',{ owner: 'test',version: 0,data: 5 });
  const before = JSON.stringify(root), value = peekState(port,'test/home',schema)!;
  value.entries[0]!.amount = 10; expect(JSON.stringify(root)).toBe(before);
  expect(openState(port,'test/home',schema)).toEqual({ entries: [{ amount: 5 }] });
  expect((port.read('test/home') as { version: number }).version).toBe(1);
});
test('detached adapter validates plain data and schema on every fresh read',() => {
  const root = { eldrift: { format: 1,records: {} as Record<string,unknown> } }, port = createMemoryPort(() => root);
  openState(port,'test/home',schema);
  root.eldrift.records['test/home'] = { owner: 'test',version: 1,data: { entries: [{ amount: NaN }] } };
  expect(() => peekState(port,'test/home',schema)).toThrow('non-JSON');
  root.eldrift.records['test/home'] = { owner: 'other',version: 1,data: { entries: [] } };
  expect(() => openState(port,'test/home',schema)).toThrow('owner mismatch');
  root.eldrift.records['test/home'] = { owner: 'test',version: 2,data: { entries: [] } };
  expect(() => openState(port,'test/home',schema)).toThrow('future version');
  root.eldrift.records['test/home'] = { owner: 'test',version: 1,data: { entries: [{ amount: 'invalid' }] } };
  expect(() => peekState(port,'test/home',schema)).toThrow('invalid state data');
});
