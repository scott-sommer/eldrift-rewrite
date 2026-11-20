import { expect, test } from 'vitest';
import { validateLogisticsRequest } from '../../src/capabilities/logistics/request';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import type { LogisticsRequest } from '../../src/capabilities/logistics/request';
const request = (): LogisticsRequest => ({ id: 'fixed',owner: 'remote',source: 'container',sink: 'bank',resource: 'energy',quantity: 50,priority: 0,expiresAt: 100,
  service: { collection: { room: 'E0N1',x: 4,y: 24 },deposit: { room: 'W0N1',x: 44,y: 25 } } });
test('exact service tiles survive serialization, reconstruction and partial delivery accounting',() => {
  const root = {},state = createMemoryPort(() => root), queue = createLogisticsRequests(state,'W0N1'), input = request();
  queue.submit(input,1); input.service!.collection.x = 1; queue.confirm('remote','fixed',{ id: 'receipt',amount: 10 },2);
  const memory = JSON.parse(JSON.stringify(root)), restored = createLogisticsRequests(createMemoryPort(() => memory),'W0N1');
  expect(restored.pending(3)[0]).toMatchObject({ quantity: 40,service: { collection: { x: 4 },deposit: { x: 44 } } });
});
test('service geometry equality is structural and an existing identity cannot acquire, lose or change constraints',() => {
  const root = {}, queue = createLogisticsRequests(createMemoryPort(() => root),'W0N1'); queue.submit(request(),1);
  const reordered = request(); reordered.service = { deposit: { y: 25,x: 44,room: 'W0N1' },collection: { y: 24,x: 4,room: 'E0N1' } }; expect(() => queue.submit(reordered,2)).not.toThrow();
  const changed = request(); changed.service!.collection.x = 3; expect(() => queue.submit(changed,2)).toThrow('identity conflict');
  const unbound = request(); delete unbound.service; expect(() => queue.submit(unbound,2)).toThrow('identity conflict');
  queue.submit({ ...unbound,id: 'plain' },2); expect(() => queue.submit({ ...request(),id: 'plain' },3)).toThrow('identity conflict');
});
test('invalid service shapes and non-world positions cannot enter requests',() => {
  for (const service of [null,{}, { collection: { room: 'E0N1',x: 50,y: 24 },deposit: { room: 'W0N1',x: 44,y: 25 } }]) {
    expect(() => validateLogisticsRequest({ ...request(),service } as LogisticsRequest)).toThrow('service');
  }
});
test('legacy logistics records preserve receipts/cancellation and older readers refuse the future queue before execution',() => {
  const root = {},state = createMemoryPort(() => root), old = request(); delete old.service;
  const records = [{ request: old,cancelled: false,receipts: [{ id: 'prior',amount: 10 }] },{ request: { ...old,id: 'cancelled' },cancelled: true,receipts: [] }];
  state.write('logistics-requests/W0N1',{ owner: 'logistics',version: 1,data: { records } });
  expect(createLogisticsRequests(state,'W0N1').pending(1)[0]!.quantity).toBe(40);
  expect(state.read('logistics-requests/W0N1')).toEqual({ owner: 'logistics',version: 2,data: { records } });
  expect(() => openState(state,'logistics-requests/W0N1',{ ...logisticsQueueSchema,version: 1 })).toThrow('future version');
});
test('legacy records with formerly unsupported service metadata cannot be silently reinterpreted',() => {
  const root = {},state = createMemoryPort(() => root);
  state.write('logistics-requests/W0N1',{ owner: 'logistics',version: 1,data: { records: [{ request: request(),cancelled: false,receipts: [] }] } });
  const before = JSON.stringify(root); expect(() => createLogisticsRequests(state,'W0N1').pending(1)).toThrow('legacy logistics service'); expect(JSON.stringify(root)).toBe(before);
});

test('route exclusions are bounded, persistent and cannot exclude either selected service tile',() => {
  const original = request(); original.service!.avoid = [{ room: 'E0N1',x: 5,y: 24 }];
  const root = {}, queue = createLogisticsRequests(createMemoryPort(() => root),'W0N1'); queue.submit(original,1);
  expect(queue.pending(1)[0]!.service!.avoid).toEqual([{ room: 'E0N1',x: 5,y: 24 }]);
  original.service!.avoid = [original.service!.collection]; expect(() => validateLogisticsRequest(original)).toThrow('Excluded');
  original.service!.avoid = Array.from({ length: 65 },() => ({ room: 'E0N1',x: 5,y: 24 })); expect(() => validateLogisticsRequest(original)).toThrow('exclusions');
});
