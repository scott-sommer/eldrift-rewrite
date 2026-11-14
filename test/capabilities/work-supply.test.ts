import { expect, test } from 'vitest';
import { workSupplySinks } from '../../src/features/logistics/work-supply';
const view = { storageAvailable: false, container: { id: 'controller-container', energy: 1880, free: 120 },
  workers: [{ id: 'worker', free: 50 }, { id: 'almost-full', free: 25 }] };
test('storage or urgent infrastructure demand suppresses fallback supply', () => {
  expect(workSupplySinks({ ...view, storageAvailable: true }, false, 1900)).toEqual([]);
  expect(workSupplySinks(view, true, 1900)).toEqual([]);
});
test('controller reserve takes priority and respects shared free capacity', () => {
  expect(workSupplySinks(view, false, 1900)).toEqual([{ id: 'controller-container', free: 20, priority: 0 }]);
  expect(workSupplySinks({ ...view, container: { ...view.container, free: 5 } }, false, 1900)[0]?.free).toBe(5);
});
test('workers receive energy when the reserve is met, absent, or full of other resources', () => {
  const expected = [{ id: 'worker', free: 50, priority: 1 }];
  expect(workSupplySinks({ ...view, container: undefined }, false, 1900)).toEqual(expected);
  expect(workSupplySinks({ ...view, container: { ...view.container, energy: 1900 } }, false, 1900)).toEqual(expected);
  expect(workSupplySinks({ ...view, container: { ...view.container, free: 0 } }, false, 1900)).toEqual(expected);
});
