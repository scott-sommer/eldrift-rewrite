import { expect, test } from 'vitest';
import { selectWorkerEnergy } from '../../src/features/work/energy-selection';
import type { CollectionSource } from '../../src/capabilities/resources/collection';
const position = { room: 'W0N0', x: 20, y: 20 };
const source = (id: string, kind: CollectionSource['kind'], stock: number, x = 20): CollectionSource =>
  ({ id, kind, stock, available: stock, position: { ...position, x } });
test('worker collection ranks nearby drops, controller links, reserved storage and local fallback', () => {
  const drop = source('drop', 'drop', 21, 22);
  const link = { ...source('link', 'link', 100), controllerLink: true };
  const storage = source('storage', 'storage', 50025);
  const container = source('container', 'container', 200);
  expect(selectWorkerEnergy([container, storage, link, drop], position, 50)?.source.id).toBe('drop');
  expect(selectWorkerEnergy([storage, link, { ...drop, stock: 20, available: 20 }], position, 50)?.source.id).toBe('link');
  expect(selectWorkerEnergy([container, storage], position, 50)).toMatchObject({ amount: 25, reserve: 50000 });
  expect(selectWorkerEnergy([container, { ...storage, available: 50000 }], position, 50)?.source.id).toBe('container');
  expect(selectWorkerEnergy([{ ...link, controllerLink: false }], position, 50)).toBeUndefined();
});
test('pickup selection never assumes it can collect a partial unreserved drop', () => {
  const drop = source('drop', 'drop', 100);
  expect(selectWorkerEnergy([{ ...drop, available: 49 }], position, 50)).toBeUndefined();
  expect(selectWorkerEnergy([{ ...drop, available: 50 }], position, 50)?.amount).toBe(50);
  expect(selectWorkerEnergy([{ ...drop, position: { ...position, room: 'W1N0' } }], position, 50)).toBeUndefined();
  expect(selectWorkerEnergy([drop], position, 0)).toBeUndefined();
});
