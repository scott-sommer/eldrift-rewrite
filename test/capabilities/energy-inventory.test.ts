import { expect, test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const store = (id: string, energy: number, capacity = 100, other = 0) => ({ id,energy,capacity,usedCapacity: energy+other,freeEnergyCapacity: capacity-energy-other });

test('all actors observe opening stock; explicitly ordered effects appear only in the next frame', () => {
  const input = [store('source',50),store('a',0),store('b',0),store('miner',50)], before = JSON.stringify(input);
  const world = createEnergyInventoryFrame(10,input); world.begin(10);
  world.queue({ id: 'a',kind: 'withdraw',source: 'source',target: 'a',amount: 50 });
  world.queue({ id: 'deposit',kind: 'transfer',source: 'miner',target: 'source',amount: 50 });
  world.queue({ id: 'b',kind: 'withdraw',source: 'source',target: 'b',amount: 50 });
  expect(world.observe('source')!.energy).toBe(50); expect(world.observe('a')!.energy).toBe(0);
  expect(world.effect('a')).toBeUndefined();
  expect(world.pending().map(intent => intent.id)).toEqual(['a','deposit','b']);
  world.pending()[0]!.amount = 1;
  expect(world.finish(['a','b','deposit']).map(effect => effect.amount)).toEqual([50,0,50]);
  expect(() => world.observe('a')).toThrow('closed');
  world.begin(11); expect(world.observe('source')!.energy).toBe(50); expect(world.observe('a')!.energy).toBe(50);
  expect(world.effect('a')).toMatchObject({ issuedAt: 10,settledAt: 11,amount: 50 });
  expect(JSON.stringify(input)).toBe(before);
});

test('shared mixed-resource capacity clips deliveries while preserving non-energy contents', () => {
  const world = createEnergyInventoryFrame(0,[store('bank',10,100,70),store('courier',50)]); world.begin(0);
  world.queue({ id: 'delivery',kind: 'transfer',source: 'courier',target: 'bank',amount: 50 });
  expect(world.finish(['delivery'])[0]!.amount).toBe(20);
  expect(world.snapshot()).toEqual([store('bank',30,100,70),store('courier',30)]);
  world.begin(1); const detached = world.observe('bank')!; detached.energy = 0;
  expect(world.observe('bank')!.energy).toBe(30);
});

test('identity, chronology and complete settlement order are bounded and invalid finish is atomic', () => {
  expect(() => createEnergyInventoryFrame(0,[store('a',1),store('a',2)])).toThrow('identities');
  const world = createEnergyInventoryFrame(5,[store('a',50),store('b',0)]);
  expect(() => world.begin(6)).toThrow('order'); world.begin(5);
  world.queue({ id: 'one',kind: 'transfer',source: 'a',target: 'b',amount: 50 });
  expect(() => world.queue({ id: 'one',kind: 'transfer',source: 'a',target: 'b',amount: 50 })).toThrow('Duplicate');
  expect(() => world.finish([])).toThrow('order'); expect(world.observe('a')!.energy).toBe(50);
  expect(() => world.snapshot()).toThrow('open');
  world.finish(['one']); expect(() => world.finish(['one'])).toThrow('closed');
  world.begin(6); world.finish([]); world.begin(7); expect(world.effect('one')).toBeUndefined();
});
