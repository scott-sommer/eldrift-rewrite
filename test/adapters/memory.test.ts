import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/persistence/intel/store';

test('memory namespace survives serialization reset without altering legacy keys', () => {
  let memory: { eldrift?: unknown; roomCache: unknown } = { roomCache: { W1N1: { labs: ['legacy'] } } };
  const intel = createIntelStore(createMemoryPort(() => memory));
  intel.observe('W1N1', { lastSeen: 10, owned: true, sourceIds: ['source'], structureIds: ['lab'], hostileIds: [] });
  memory = JSON.parse(JSON.stringify(memory));
  const restored = createIntelStore(createMemoryPort(() => memory)).read('W1N1', 20);
  expect(restored.record.structureIds).toEqual(['lab']);
  expect(restored.visible).toBe(false);
  expect(memory.roomCache).toEqual({ W1N1: { labs: ['legacy'] } });
});

test.each([null, { format: 2, records: {} }, { format: 1, records: [] }])('incompatible root is preserved', eldrift => {
  const memory = { eldrift };
  const before = JSON.stringify(memory);
  expect(() => createMemoryPort(() => memory).read('intel/W1N1')).toThrow();
  expect(JSON.stringify(memory)).toBe(before);
});

test('adapter rejects invalid keys and returns detached records', () => {
  const memory = {};
  const port = createMemoryPort(() => memory);
  expect(() => port.read('__proto__')).toThrow('Invalid state key');
  const value = { owner: 'intel', version: 1, data: { count: 1 } };
  port.write('intel/W1N1', value);
  value.data.count = 2;
  expect(port.read('intel/W1N1')).toEqual({ owner: 'intel', version: 1, data: { count: 1 } });
});
