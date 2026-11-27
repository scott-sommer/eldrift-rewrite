import { expect,test } from 'vitest';
import { createReadOnlyStateSnapshot } from '../../src/persistence/read-snapshot';
test('request snapshot captures existing and missing keys once and returns detached copies without writes',() => {
  const values: Record<string,unknown> = { present: { owner: 'owner',version: 1,data: { stock: 10 } } }; let reads = 0;
  const snapshot = createReadOnlyStateSnapshot({ read: key => { reads++; return values[key]; },write() { throw new Error('Unexpected owner write'); } });
  const first = snapshot.read('present') as { data: { stock: number } }; first.data.stock = 0;
  values.present = { owner: 'owner',version: 1,data: { stock: 20 } };
  expect(snapshot.read('present')).toMatchObject({ data: { stock: 10 } }); expect(snapshot.read('absent')).toBeUndefined();
  values.absent = values.present; expect(snapshot.read('absent')).toBeUndefined(); expect(reads).toBe(2);
  expect(() => snapshot.write('present',{ owner: 'owner',version: 1,data: {} })).toThrow('Read-only');
});
