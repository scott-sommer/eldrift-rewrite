import { expect, test } from 'vitest';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import type { Envelope } from '../../src/persistence/versioned-state';
const request = { id: 'fill', owner: 'economy', source: 'container', sink: 'spawn', resource: 'energy', quantity: 100, priority: 0, expiresAt: 20 };
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  return { port, queue: createLogisticsRequests(port, 'home') };
}
test('partial delivery receipts survive reconstruction and cannot be replayed or changed', () => {
  const { port, queue } = fixture();
  queue.submit(request, 1);
  expect(queue.confirm('economy', 'fill', { id: 'worker:tick2', amount: 40 }, 3)).toBe(true);
  const restored = createLogisticsRequests(port, 'home');
  expect(restored.confirm('economy', 'fill', { id: 'worker:tick2', amount: 40 }, 4)).toBe(false);
  expect(restored.pending(4)[0]!.quantity).toBe(60);
  expect(() => restored.confirm('economy', 'fill', { id: 'worker:tick2', amount: 41 }, 4)).toThrow();
  expect(() => restored.confirm('economy', 'fill', { id: 'second', amount: 61 }, 4)).toThrow();
  expect(restored.pending(4)[0]!.quantity).toBe(60);
});
test('completion and cancellation survive producer resubmission without recreating work', () => {
  const { queue } = fixture();
  queue.submit(request, 1);
  queue.confirm('economy', 'fill', { id: 'delivery', amount: 100 }, 2);
  queue.submit(request, 3);
  expect(queue.pending(3)).toEqual([]);
  queue.submit({ ...request, id: 'cancel' }, 3);
  expect(queue.cancel('economy', 'cancel')).toBe(true);
  queue.submit({ ...request, id: 'cancel' }, 4);
  expect(queue.pending(4)).toEqual([]);
});
test('owner identity, priority, expiry and request parameters stay explicit', () => {
  const { queue } = fixture();
  queue.submit(request, 1);
  queue.submit({ ...request, owner: 'industry', priority: -1 }, 1);
  expect(queue.pending(2).map(item => item.owner)).toEqual(['industry', 'economy']);
  expect(queue.cancel('unknown', 'fill')).toBe(false);
  expect(() => queue.submit({ ...request, sink: 'extension' }, 2)).toThrow();
  expect(queue.pending(20)).toEqual([]);
  expect(queue.confirm('economy', 'fill', { id: 'late', amount: 10 }, 20)).toBe(false);
  expect(() => queue.submit(request, 20)).toThrow();
});

test('last-valid-tick delivery settles at expiry even after another request is submitted', () => {
  const { queue } = fixture();
  queue.submit(request, 1);
  queue.submit({ ...request, id: 'new', expiresAt: 30 }, 20);
  expect(queue.pending(20).map(item => item.id)).toEqual(['new']);
  expect(queue.confirm('economy', 'fill', { id: 'last-delivery', amount: 100 }, 20, 19)).toBe(true);
  expect(queue.confirm('economy', 'fill', { id: 'last-delivery', amount: 100 }, 20, 19)).toBe(false);
  expect(queue.confirm('economy', 'fill', { id: 'expired-intent', amount: 1 }, 20, 20)).toBe(false);
  expect(queue.availableSlots(20)).toBe(198);
  expect(queue.availableSlots(21)).toBe(199);
});

test('one pending request lookup preserves owner, receipt, cancellation and expiry boundaries',() => {
  const { queue } = fixture(); queue.submit(request,1); queue.submit({ ...request,owner: 'industry' },1); queue.submit({ ...request,id: 'expiry' },1);
  queue.confirm('economy','fill',{ id: 'partial',amount: 40 },2);
  const current = queue.findPending('economy','fill',3)!; expect(current.quantity).toBe(60); current.source = 'changed';
  expect(queue.findPending('economy','fill',3)).toMatchObject({ source: 'container',quantity: 60 }); expect(queue.findPending('industry','fill',3)?.quantity).toBe(100);
  queue.confirm('economy','fill',{ id: 'rest',amount: 60 },4); expect(queue.findPending('economy','fill',4)).toBeUndefined();
  queue.cancel('industry','fill'); expect(queue.findPending('industry','fill',4)).toBeUndefined(); expect(queue.findPending('economy','expiry',20)).toBeUndefined();
});
