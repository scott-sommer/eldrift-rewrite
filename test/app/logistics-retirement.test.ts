import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { retireLogisticsUnit } from '../../src/features/logistics/retire-unit';
import { createCreepMaintenance } from '../../src/app/creep-maintenance';
import { createLogisticsRetirement } from '../../src/app/logistics-retirement';
const attempt = (unit: string) => ({ id: 'pending', unit, target: 'sink', room: 'home', resource: 'energy', kind: 'transfer' as const, tick: 1, amount: 30, cargoBefore: 30 });
test('name reuse retires only old native journal and preserves unresolved evidence', () => {
  const state = createMemoryPort(() => memory);
  const memory = {};
  let roster = [{ name: 'worker', id: 'old' }];
  const maintain = createCreepMaintenance(state, () => roster, {}, createLogisticsRetirement(state));
  maintain();
  createTransferJournal(state, 'old').begin(attempt('old'));
  createTransferJournal(state, 'new').begin(attempt('new'));
  roster = [{ name: 'worker', id: 'new' }];
  maintain();
  expect(state.read('logistics-attempts/old')).toBeUndefined();
  expect(state.read('logistics-attempts/new')).toBeDefined();
  expect(state.read('logistics-retired/empire')).toMatchObject({ data: { entries: [{ unit: 'old', journal: { acknowledged: false, result: null } }] } });
});
test('interrupted deletion replays without duplicating archive or losing pending evidence', () => {
  const memory = {};
  const base = createMemoryPort(() => memory);
  createTransferJournal(base, 'unit').begin(attempt('unit'));
  let fail = true;
  const state = { ...base, remove(key: string, owner: string) { if (fail) { fail = false; throw new Error('interrupted'); } base.remove(key, owner); } };
  expect(() => retireLogisticsUnit(state, 'unit')).toThrow('interrupted');
  retireLogisticsUnit(state, 'unit');
  retireLogisticsUnit(state, 'unit');
  const record = base.read('logistics-retired/empire') as { data: { entries: unknown[]; discarded: number } };
  expect(record.data.entries).toHaveLength(1);
  expect(record.data.discarded).toBe(0);
  expect(base.read('logistics-attempts/unit')).toBeUndefined();
});
test('retirement keeps a bounded archive and refuses deletion under the wrong owner', () => {
  const memory = {};
  const state = createMemoryPort(() => memory);
  for (let index = 0; index < 55; index++) {
    const unit = 'unit-' + index;
    createTransferJournal(state, unit).begin(attempt(unit));
    retireLogisticsUnit(state, unit);
    expect(state.read('logistics-attempts/' + unit)).toBeUndefined();
  }
  const record = state.read('logistics-retired/empire') as { data: { entries: { unit: string }[]; discarded: number } };
  expect(record.data.entries).toHaveLength(50);
  expect(record.data.entries[0]!.unit).toBe('unit-5');
  expect(record.data.discarded).toBe(5);
  expect(() => state.remove('logistics-retired/empire', 'other')).toThrow('owner mismatch');
  expect(state.read('logistics-retired/empire')).toBeDefined();
});
