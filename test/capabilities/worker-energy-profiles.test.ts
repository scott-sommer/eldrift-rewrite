import { expect, test } from 'vitest';
import { selectProfileEnergy } from '../../src/features/work/energy-profiles';
import type { WorkerEnergyProfile } from '../../src/features/work/energy-profiles';
import type { CollectionSource } from '../../src/capabilities/resources/collection';
const position = { room: 'W0N0', x: 20, y: 20 };
const source = (id: string, kind: CollectionSource['kind'], stock: number, distance = 1): CollectionSource =>
  ({ id, kind, stock, available: stock, position: { ...position, x: position.x + distance } });
const choose = (profile: WorkerEnergyProfile, sources: CollectionSource[], holdStoragePosition = false, capacity = 50) =>
  selectProfileEnergy(sources, position, 50, { profile, capacity, storageReserve: 0, holdStoragePosition });
test('builder strict drop/link thresholds and full-capacity condition select the intended source', () => {
  const storage = source('storage', 'storage', 1000);
  const link = { ...source('link', 'link', 400), controllerLink: true };
  expect(choose('builder', [source('drop', 'drop', 50), link, storage])?.source.id).toBe('storage');
  expect(choose('builder', [source('drop', 'drop', 51), link, storage])?.source.id).toBe('drop');
  expect(choose('builder', [{ ...link, stock: 401, available: 401 }, storage])?.source.id).toBe('link');
  expect(choose('builder', [{ ...link, stock: 401, available: 401 }, storage], false, 450)?.source.id).toBe('storage');
  expect(choose('builder', [{ ...link, stock: 500, available: 500, position: { ...position, x: 25 } }, storage])?.source.id).toBe('storage');
  expect(choose('builder', [source('container', 'container', 100)])).toBeUndefined();
});
test('ordinary upgrader prefers nearby drops above20 then controller links, storage and fallback drops', () => {
  const link = { ...source('link', 'link', 1, 10), controllerLink: true };
  const storage = source('storage', 'storage', 100);
  expect(choose('upgrader', [link, storage, source('drop', 'drop', 20)])?.source.id).toBe('link');
  expect(choose('upgrader', [link, storage, source('drop', 'drop', 21)])?.source.id).toBe('drop');
  expect(choose('upgrader', [storage, source('drop', 'drop', 100, 10)])?.source.id).toBe('storage');
  expect(choose('upgrader', [source('drop', 'drop', 10, 10)])?.source.id).toBe('drop');
});
test('fortifier stock policy uses terminal overflow, storage, terminal, containers then largest drop', () => {
  const storage = source('storage', 'storage', 1000);
  const terminal = source('terminal', 'terminal', 35000);
  expect(choose('fortifier', [storage, terminal])?.source.id).toBe('storage');
  expect(choose('fortifier', [storage, { ...terminal, stock: 35001, available: 35001 }])?.source.id).toBe('terminal');
  expect(choose('fortifier', [terminal, source('container', 'container', 500)])?.source.id).toBe('terminal');
  expect(choose('fortifier', [source('small', 'drop', 10), source('large', 'drop', 100, 10)])?.source.id).toBe('large');
});
test('upgradeV2 full-capacity links and local stores precede optional far storage movement', () => {
  const link = { ...source('link', 'link', 49), controllerLink: true };
  const storage = source('storage', 'storage', 100, 8);
  const container = source('container', 'container', 100, 3);
  expect(choose('upgrader-v2', [link, storage, container])?.source.id).toBe('container');
  expect(choose('upgrader-v2', [{ ...link, stock: 50, available: 50 }, storage, container])?.source.id).toBe('link');
  expect(choose('upgrader-v2', [storage])?.source.id).toBe('storage');
  expect(choose('upgrader-v2', [storage], true)).toBeUndefined();
  expect(choose('upgrader-v2', [storage, container], true)?.source.id).toBe('container');
  expect(choose('upgrader-v2', [source('drop', 'drop', 100)])).toBeUndefined();
});
