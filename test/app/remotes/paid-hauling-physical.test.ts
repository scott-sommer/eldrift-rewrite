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
  expect(f.inventory.snapshot().map(store => [store.id,store.energy])).toEqual([['native-id',0],['container',50],['bank',82]]);
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
