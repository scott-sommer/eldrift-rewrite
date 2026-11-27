import { expect,test } from 'vitest';
import { resolvePaidCourierOpening } from '../../../src/app/remotes/startup/motion-observation/opening';
import type { PaidCourierObservation } from '../../../src/app/remotes/startup/motion-observation/model';
import type { TransferObservation } from '../../../src/capabilities/logistics/confirmation';
function fixture(kind: 'withdraw' | 'transfer' = 'withdraw',amount = 56) {
  const request = { id: 'trip',owner: 'owner',source: 'container',sink: 'bank',resource: 'energy',quantity: amount,priority: 0,expiresAt: 100 };
  const record = { id: 'trip',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: 'native',request },wakeAt: 11,retries: 0,expiresAt: 100 };
  const observed: PaidCourierObservation = { observedAt: 11,name: 'courier',unit: 'native',owner: 'fleet',position: { room: 'W0N1',x: 10,y: 25 },energy: kind === 'withdraw' ? amount : 0,fatigue: 0,activeAt: 1,expiresAt: 1500,retireAt: 1400,stage: 'pending',
    task: { record,id: 'trip',wakeAt: 11,expiresAt: 100,remaining: amount,receipts: [],request },
    journal: { acknowledged: false,result: null,attempt: { id: 'attempt',unit: 'native',target: kind === 'withdraw' ? 'container' : 'bank',room: 'W0N1',resource: 'energy',kind,tick: 10,amount,cargoBefore: kind === 'withdraw' ? 0 : amount } } };
  const witness: TransferObservation = { tick: 11,cargo: observed.energy,events: [{ source: kind === 'withdraw' ? 'container' : 'native',target: kind === 'withdraw' ? 'native' : 'bank',resource: 'energy',amount }] };
  return { observed,witness };
}
test('verified past withdrawal resumes delivery with no future income or journal mutation',() => {
  const f = fixture(),before = JSON.stringify(f.observed),result = resolvePaidCourierOpening(f.observed,f.witness);
  expect(result).toMatchObject({ status: 'ready',opening: { continuation: { stage: 'deliver',readyAt: 11,requestRemaining: 56 },reflectedEffect: { amount: 56,projectedIncome: 0 } } });
  expect(JSON.stringify(f.observed)).toBe(before);
  if (result.status === 'ready') { expect(result.opening.observed.journal!.acknowledged).toBe(false); result.opening.observed.energy = 1; }
  expect(f.observed.energy).toBe(56);
});
test('past delivery waits for task completion and never double-subtracts a posted receipt',() => {
  const f = fixture('transfer');
  expect(resolvePaidCourierOpening(f.observed,f.witness)).toMatchObject({ opening: { continuation: { stage: 'completion',readyAt: 12,requestRemaining: 0 },reflectedEffect: { postedAmount: 0,projectedIncome: 0 } } });
  f.observed.task!.receipts.push({ id: 'attempt',amount: 56 }); f.observed.task!.remaining = 0;
  f.observed.journal!.result = { status: 'observed',amount: 56 };
  expect(resolvePaidCourierOpening(f.observed)).toMatchObject({ opening: { continuation: { requestRemaining: 0 },reflectedEffect: { postedAmount: 56,projectedIncome: 0 } } });
});
test('unrelated cargo changes, missing/wrong-window events and same-frame intents refuse',() => {
  const f = fixture(); expect(resolvePaidCourierOpening(f.observed).status).toBe('deferred');
  expect(resolvePaidCourierOpening(f.observed,{ ...f.witness,tick: 12 }).status).toBe('deferred');
  f.observed.energy = 55; expect(resolvePaidCourierOpening(f.observed,{ ...f.witness,cargo: 55 })).toMatchObject({ reason: 'courier-opening-cargo' });
  f.observed.observedAt = 10; expect(resolvePaidCourierOpening(f.observed)).toMatchObject({ reason: 'courier-opening-current-intent' });
});
test('partial delivery and task wake clocks preserve remaining work without an invented turnaround',() => {
  const f = fixture('transfer'); f.observed.energy = 44; f.observed.journal!.attempt!.cargoBefore = 100; f.observed.task!.remaining = 100; f.observed.task!.wakeAt = 15;
  expect(resolvePaidCourierOpening(f.observed,{ ...f.witness,cargo: 44 })).toMatchObject({ opening: { continuation: { stage: 'deliver',readyAt: 15,requestRemaining: 44 } } });
  f.observed.task!.receipts = [{ id: 'attempt',amount: 1 }]; expect(resolvePaidCourierOpening(f.observed,{ ...f.witness,cargo: 44 })).toMatchObject({ reason: 'courier-opening-receipt' });
});
