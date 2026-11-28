import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const position = { room: 'W0N1',x: 10,y: 10 };
function fixture() {
  return createEnergyInventoryFrame(0,[{ id: 'container',energy: 42,capacity: 2000,usedCapacity: 42,freeEnergyCapacity: 1958 },{ id: 'miner',energy: 5,capacity: 50,usedCapacity: 5,freeEnergyCapacity: 45 }],[],{
    sources: [],ground: [],containers: [{ id: 'container',position,decay: { remaining: 1,interval: 99,amount: 5000 } }],structures: [{ id: 'container',position,hits: 5000,hitsMax: 250000,repairable: true }],decayDivisor: 1000 });
}

test('lifecycle needs a complete explicit object order; refused or reentrant settlement cannot leak partial state', () => {
  const world = fixture(); world.begin(0);
  expect(() => world.finish([])).toThrow('Explicit'); expect(() => world.finish([],() => [])).toThrow('object-processing order');
  expect(world.observe('container')!.energy).toBe(42); expect(world.structure('container')!.hits).toBe(5000);
  world.finish([],operations => {
    expect(() => world.checkpoint()).toThrow('open');
    expect(() => world.queue({ id: 'late',kind: 'transfer',source: 'miner',target: 'container',amount: 1 })).toThrow('closed');
    return operations.map(operation => operation.key);
  });
  expect(world.snapshot().some(store => store.id === 'container')).toBe(false);
  expect(world.ecologySnapshot().ground).toEqual([{ position,energy: 42 }]);
});

test('destroyed stores and repair targets stay absent after resume and destruction cannot be dated in the future', () => {
  const world = fixture(); world.begin(0); world.finish([],operations => operations.map(operation => operation.key));
  const cp = world.checkpoint(),restored = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); restored.begin(1);
  expect(restored.observe('container')).toBeUndefined(); expect(restored.structure('container')).toBeUndefined();
  expect(() => restored.queue({ id: 'repair',kind: 'repair',source: 'miner',target: 'container',position,profile: { workParts: 1,boostBonuses: [] } })).toThrow('Destroyed');
  cp.ecology!.containers[0]!.destroyedAt = 2;
  expect(() => createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology)).toThrow('Future');
});
