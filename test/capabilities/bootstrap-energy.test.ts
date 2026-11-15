import { expect, test } from 'vitest';
import { selectBootstrapEnergy, selectBootstrapSource } from '../../src/features/work/bootstrap-energy';
import type { CollectionSource } from '../../src/capabilities/resources/collection';
const position = { room: 'W0N1', x: 20, y: 20 };
const source = (kind: CollectionSource['kind'], stock: number): CollectionSource =>
  ({ id: kind, kind, stock, available: stock, position });
test('bootstrap stock priority is remains, drops, storage, terminal, then containers', () => {
  const sources = ['remains', 'drop', 'storage', 'terminal', 'container'].map(kind => source(kind as CollectionSource['kind'], 100));
  for (const expected of [...sources]) {
    expect(selectBootstrapEnergy(sources, position, 50, 50)?.source.id).toBe(expected.id);
    sources.shift();
  }
});
test('strict thresholds and shared reservations exclude unavailable bootstrap stock', () => {
  expect(selectBootstrapEnergy([source('drop', 70)], position, 50, 50)).toBeUndefined();
  expect(selectBootstrapEnergy([source('drop', 71)], position, 50, 50)?.amount).toBe(50);
  expect(selectBootstrapEnergy([source('container', 50)], position, 50, 50)).toBeUndefined();
  expect(selectBootstrapEnergy([source('container', 51)], position, 50, 50)?.amount).toBe(50);
  expect(selectBootstrapEnergy([{ ...source('drop', 100), available: 49 }], position, 50, 50)).toBeUndefined();
  expect(selectBootstrapEnergy([source('link', 800)], position, 50, 50)).toBeUndefined();
  expect(selectBootstrapEnergy([source('storage', 1)], position, 50, 50)?.amount).toBe(1);
});
test('harvesting selects available energy before proximity and earliest regeneration when empty', () => {
  const near = { id: 'near', position, energy: 0, regeneration: 20 };
  const far = { id: 'far', position: { ...position, x: 30 }, energy: 100, regeneration: 100 };
  expect(selectBootstrapSource([near, far], position)?.id).toBe('far');
  expect(selectBootstrapSource([near, { ...far, energy: 0 }], position)?.id).toBe('near');
  expect(selectBootstrapSource([near, { ...far, energy: 0, regeneration: 10 }], position)?.id).toBe('far');
  expect(selectBootstrapSource([{ ...near, position: { ...position, room: 'E0N1' } }], position)).toBeUndefined();
});

test('bootstrap source assignment survives proximity changes but releases depleted, missing and foreign sources', () => {
  const position = { room: 'W0N1', x: 10, y: 10 };
  const near = { id: 'near', position, energy: 100, regeneration: 0 };
  const assigned = { id: 'assigned', position: { ...position, x: 20 }, energy: 100, regeneration: 0 };
  expect(selectBootstrapSource([near, assigned], position, assigned.id)?.id).toBe('assigned');
  expect(selectBootstrapSource([near, { ...assigned, energy: 0 }], position, assigned.id)?.id).toBe('near');
  expect(selectBootstrapSource([near], position, assigned.id)?.id).toBe('near');
  expect(selectBootstrapSource([near, { ...assigned, position: { ...position, room: 'E0N1' } }], position, assigned.id)?.id).toBe('near');
});
