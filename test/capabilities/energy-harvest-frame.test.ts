import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const position = { room: 'W0N1',x: 10,y: 10 };
const store = (id: string,energy: number,capacity: number) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy });
function fixture() {
  return createEnergyInventoryFrame(0,[store('miner',48,50),store('container',2000,2000)],[],{
    sources: [{ id: 'source',position: { ...position,y: 9 },energy: 100,capacity: 3000,regenerationIn: null,regenerationTicks: 300 }],ground: [],containers: [{ id: 'container',position }],decayDivisor: 1000 });
}

test('harvest consumes full source output and conserves physical energy except the explicit drop decay', () => {
  const world = fixture(); world.begin(0);
  world.queue({ id: 'mine',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position,container: 'container' });
  expect(world.observe('miner')!.energy).toBe(48); expect(world.source('source')!.energy).toBe(100);
  expect(world.finish(['mine'])).toMatchObject([{ amount: 8,carriedEnergy: 2,containerEnergy: 0,droppedEnergy: 6,settledAt: 1 }]);
  expect(world.ecologySnapshot()).toMatchObject({ sources: [{ energy: 92,regenerationIn: 299 }],ground: [{ energy: 5 }] });
  const total = world.snapshot().reduce((sum,store) => sum+store.energy,0)+world.ecologySnapshot().sources[0]!.energy+world.ecologySnapshot().ground[0]!.energy;
  expect(total).toBe(2148-1);
});

test('source clocks, dropped energy and next-frame harvest effects survive JSON checkpoint resume', () => {
  const world = fixture(); world.begin(0); world.queue({ id: 'mine',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position }); world.finish(['mine']);
  const cp = JSON.parse(JSON.stringify(world.checkpoint()));
  const restored = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology);
  for (let tick = 1; tick <= 300; tick++) { world.begin(tick); restored.begin(tick); expect(restored.effect('mine')).toEqual(world.effect('mine')); world.finish([]); restored.finish([]); }
  expect(restored.checkpoint()).toEqual(world.checkpoint()); expect(restored.ecologySnapshot().sources[0]!.energy).toBe(3000);
});

test('invalid settlement order leaves source/ground/stock unchanged and harvest bounds refuse invalid endpoints', () => {
  const world = fixture(); world.begin(0);
  expect(() => world.queue({ id: 'far',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position: { ...position,x: 20 } })).toThrow('geometry');
  world.queue({ id: 'mine',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position });
  expect(() => world.finish([])).toThrow('settlement order');
  expect(world.source('source')!.energy).toBe(100); expect(world.observe('miner')!.energy).toBe(48);
  expect(world.finish(['mine'])).toMatchObject([{ amount: 8 }]);
});
