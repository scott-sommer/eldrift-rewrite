import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';

test('actual task service, shared movement and journaled transfers complete a trip and recruit the next without invented timing or income', () => {
  const f = paidHaulingPhysicalFixture();
  for (let tick = 100; tick <= 112; tick++) f.step();
  expect(f.frames.filter(frame => frame.effects.some(effect => effect.kind === 'transfer')).flatMap(frame => frame.effects.filter(effect => effect.kind === 'transfer').map(effect => [effect.settledAt,effect.amount])))
    .toEqual([[105,32],[112,50]]);
  expect(f.frames.filter(frame => frame.effects.some(effect => effect.kind === 'withdraw')).map(frame => frame.tick)).toEqual([108]);
  expect(f.frames.filter(frame => frame.stage === 'completion').map(frame => [frame.tick,frame.readyAt,frame.x])).toEqual([[105,106,10],[112,113,10]]);
  expect(f.frames.slice(0,5).map(frame => frame.x)).toEqual([14,13,12,11,10]);
  expect(Object.fromEntries(f.inventory.snapshot().map(store => [store.id,store.energy]))).toEqual({ 'native-id': 0,container: 50,bank: 82 });
  expect(f.deliveries.map(row => [row.source,row.request,row.tick,row.issuedAt,row.energy])).toEqual([['source','paid-courier',105,104,32],['source','paid-courier',112,111,50]]);
  expect(f.seed.state.read('logistics-requests/W0N1')).toMatchObject({ data: { records: [
    { cancelled: true,receipts: [{ amount: 32 }] },{ cancelled: true,receipts: [{ amount: 50 }] },
  ] } });
});

test('productive forecasting stops at unrenewed authority and rejects a different generation', () => {
  const expired = paidHaulingPhysicalFixture(130); for (let tick = 100; tick < 130; tick++) expired.step();
  expect(() => expired.step()).toThrow('authority/lifecycle invalidated');
  const renewed = paidHaulingPhysicalFixture(130); renewed.step(); renewed.renew(1400);
  expect(() => renewed.step()).not.toThrow();
  const changed = paidHaulingPhysicalFixture(); changed.reassign(); expect(() => changed.step()).toThrow('authority invalidated');
  const unbounded = paidHaulingPhysicalFixture(); unbounded.renew(Infinity); expect(() => unbounded.step()).toThrow('authority invalidated');
});

test('an explicit lease renewal does not extend an existing request deadline', () => {
  const f = paidHaulingPhysicalFixture(101); f.step(); f.renew(1400);
  expect(() => f.step()).toThrow('authority invalidated');
});


test('fleet settlement emits a delivery once even when productive work is omitted', () => {
  const f = paidHaulingPhysicalFixture(); for (let tick = 100; tick < 105; tick++) f.step();
  const confirmation = f.step([{ kind: 'settle' }]);
  expect(confirmation.visits).toEqual([]);
  expect(confirmation.deliveries).toMatchObject([{ energy: 32,tick: 105 }]);
  expect(f.step().deliveries).toEqual([]);
});

test('outside operations run at their declared phase and share action ownership', () => {
  const f = paidHaulingPhysicalFixture(),order: string[] = [];
  expect(() => f.step([{ kind: 'external',id: 'before',run: shared => {
    order.push('before'); expect(shared.inventory.observe('native-id')?.energy).toBe(32);
  } },{ kind: 'settle' },{ kind: 'paid',name: 'paid-courier',work: true },{ kind: 'external',id: 'after',run: shared => {
    order.push('after'); expect(shared.arbiter.claim('paid-courier','outside-owner')).toBe(true);
  } }])).toThrow('action ownership invalidated');
  // Movement is flushed after all actor operations; a conflicting outside owner invalidates that flush.
  expect(() => f.world.snapshot()).toThrow('Cannot resume failed home world');
  expect(order).toEqual(['before','after']);
});


test('outside capacity claims are shared with paid task execution and can be released on the next frame', () => {
  const f = paidHaulingPhysicalFixture();
  const first = f.step([{ kind: 'external',id: 'resident-booking',run: shared => {
    expect(shared.quantities.reserve({ id: 'resident',owner: 'resident',holder: 'resident',scope: 'resident',expiresAt: 110,
      allocations: [{ pool: logisticsPool('capacity','bank'),amount: 100 }] },{ [logisticsPool('capacity','bank')]: 100 },100)).toBe(true);
  } },{ kind: 'settle' },{ kind: 'paid',name: 'paid-courier',work: true }]);
  expect(first.transit.states[0]!.position.x).toBe(14);
  const second = f.step([{ kind: 'settle' },{ kind: 'external',id: 'release',run: shared => { shared.quantities.releaseScope('resident'); } },{ kind: 'paid',name: 'paid-courier',work: true }]);
  expect(second.transit.states[0]!.position.x).toBe(13);
});
