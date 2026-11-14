import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createGroundJournal } from '../../src/features/logistics/ground-journal';
import { retireGroundUnit } from '../../src/features/logistics/retire-ground-unit';
import { createCreepMaintenance } from '../../src/app/creep-maintenance';
import { createLogisticsRetirement } from '../../src/app/logistics-retirement';
const attempt = (unit: string) => ({ id: 'drop', unit, resource: 'energy', tick: 1,
  position: { room: 'E0N1', x: 20, y: 21 }, amount: 30, cargoBefore: 30, hitsBefore: 100, groundBefore: 0 });
function fixture() { const memory = {}; return createMemoryPort(() => memory); }
test('reused creep name archives unresolved old ground evidence and preserves the new identity', () => {
  const state = fixture();
  let roster = [{ name: 'supply', id: 'old' }];
  const maintain = createCreepMaintenance(state, () => roster, {}, createLogisticsRetirement(state));
  maintain();
  createGroundJournal(state, 'old').begin(attempt('old'));
  createGroundJournal(state, 'new').begin(attempt('new'));
  roster = [{ name: 'supply', id: 'new' }];
  maintain();
  expect(state.read('ground-delivery/old')).toBeUndefined();
  expect(state.read('ground-delivery/new')).toBeDefined();
  expect(state.read('ground-retired/empire')).toMatchObject({ data: { entries: [{ unit: 'old', journal: { result: null, acknowledged: false } }] } });
});
test('archive persists before deletion and interruption does not duplicate evidence', () => {
  const base = fixture();
  createGroundJournal(base, 'unit').begin(attempt('unit'));
  let fail = true;
  const state = { ...base, remove(key: string, owner: string) { if (fail) { fail = false; throw new Error('interrupted'); } base.remove(key, owner); } };
  expect(() => retireGroundUnit(state, 'unit')).toThrow('interrupted');
  retireGroundUnit(state, 'unit');
  retireGroundUnit(state, 'unit');
  const archive = state.read('ground-retired/empire') as { data: { entries: unknown[] } };
  expect(archive.data.entries).toHaveLength(1);
  expect(state.read('ground-delivery/unit')).toBeUndefined();
});
test('empty journals retire without archive growth and populated archive is bounded', () => {
  const state = fixture();
  createGroundJournal(state, 'empty').read();
  retireGroundUnit(state, 'empty');
  expect(state.read('ground-delivery/empty')).toBeUndefined();
  expect(state.read('ground-retired/empire')).toBeUndefined();
  for (let index = 0; index < 55; index++) {
    const unit = 'u' + index;
    createGroundJournal(state, unit).begin(attempt(unit));
    retireGroundUnit(state, unit);
  }
  const archive = state.read('ground-retired/empire') as { data: { entries: { unit: string }[]; discarded: number } };
  expect(archive.data.entries).toHaveLength(50);
  expect(archive.data.entries[0]!.unit).toBe('u5');
  expect(archive.data.discarded).toBe(5);
  expect(() => state.remove('ground-retired/empire', 'logistics')).toThrow();
});
