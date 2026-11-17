import { expect, test } from 'vitest';
import { mergeConstructionEntries } from '../../src/features/construction/entries';
import { constructionTypeOrder, orderConstructionEntries } from '../../src/features/construction/order';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const entry: PlanEntry = { type: 'rampart', x: 25, y: 25, rcl: 6, priority: 50, source: 'strategy', minimumStoredEnergy: 50000 };
const types = new Set(constructionTypeOrder);
test('manual metadata wins in either input order and identical duplicates collapse detached', () => {
  const manual: PlanEntry = { ...entry, source: 'operator', priority: -50, minimumStoredEnergy: 1000 };
  const first = mergeConstructionEntries([entry, manual, entry], types);
  expect(first).toEqual([manual]);
  expect(mergeConstructionEntries([manual, entry, manual], types)).toEqual(first);
  first[0]!.minimumStoredEnergy = 0;
  expect(manual.minimumStoredEnergy).toBe(1000);
  expect(entry.minimumStoredEnergy).toBe(50000);
});
test('conflicting same-authority duplicates and invalid dependency graphs reject explicitly', () => {
  expect(() => mergeConstructionEntries([entry, { ...entry, rcl: 7 }], types)).toThrow('duplicates');
  expect(() => mergeConstructionEntries([{ ...entry, dependencies: ['spawn:24:25'] }], types)).toThrow('dependencies');
  expect(() => mergeConstructionEntries([{ ...entry, dependencies: ['rampart:25:25'] }], types)).toThrow('dependencies');
});
test('bootstrap precedes extraction, capacity, defense and later infrastructure with stable ties', () => {
  const spawn: PlanEntry = { ...entry, type: 'spawn', x: 24, rcl: 1 };
  const road: PlanEntry = { ...entry, type: 'road', x: 23, rcl: 2 };
  const extension: PlanEntry = { ...entry, type: 'extension', x: 22, rcl: 2 };
  const lab: PlanEntry = { ...entry, type: 'lab', x: 21, rcl: 6 };
  const policy = { bootstrapSpawn: 'spawn:24:25', types: constructionTypeOrder };
  const input = [lab, entry, extension, road, spawn];
  expect(orderConstructionEntries(input, policy).map(item => item.type)).toEqual(['spawn', 'road', 'extension', 'rampart', 'lab']);
  expect(orderConstructionEntries([...input].reverse(), policy)).toEqual(orderConstructionEntries(input, policy));
  expect(input[0]).toBe(lab);
  expect(() => orderConstructionEntries([], policy)).toThrow('bootstrap');
});
