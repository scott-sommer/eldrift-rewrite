import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const position = { room: 'W0N1',x: 10,y: 10 },profile = { workParts: 1,boostBonuses: [] };
const store = (id: string) => ({ id,energy: 5,capacity: 50,usedCapacity: 5,freeEnergyCapacity: 45 });
function fixture() { return createEnergyInventoryFrame(0,[store('a'),store('b')],[],{ sources: [],ground: [],containers: [],structures: [{ id: 'wall',position,hits: 50,hitsMax: 100,repairable: true }],decayDivisor: 1000 }); }

test('racing repairs charge only the actual winner and preserve frozen observations before settlement', () => {
  const world = fixture(); world.begin(0);
  world.queue({ id: 'a',kind: 'repair',source: 'a',target: 'wall',position,profile }); world.queue({ id: 'b',kind: 'repair',source: 'b',target: 'wall',position,profile });
  expect(world.structure('wall')!.hits).toBe(50); expect(world.observe('a')!.energy).toBe(5);
  expect(() => world.finish(['a'])).toThrow('settlement order'); expect(world.structure('wall')!.hits).toBe(50);
  expect(world.finish(['b','a'])).toMatchObject([{ id: 'b',amount: 1,repairedHits: 50 },{ id: 'a',amount: 0,repairedHits: 0 }]);
  expect(world.snapshot().map(store => store.energy)).toEqual([5,4]);
});

test('structure-only ecology and repair evidence remain in detached JSON checkpoints', () => {
  const world = fixture(); world.begin(0); world.queue({ id: 'a',kind: 'repair',source: 'a',target: 'wall',position,profile }); world.finish(['a']);
  const checkpoint = JSON.parse(JSON.stringify(world.checkpoint())); expect(checkpoint.ecology.structures[0].hits).toBe(100);
  const resumed = createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects,checkpoint.ecology);
  checkpoint.ecology.structures[0].hits = 0; resumed.begin(1); expect(resumed.structure('wall')!.hits).toBe(100); expect(resumed.effect('a')).toMatchObject({ kind: 'repair',amount: 1,repairedHits: 50 });
});

test('out-of-range repair and corrupted energy/hit effects refuse instead of inventing work', () => {
  const world = fixture(); world.begin(0); expect(() => world.queue({ id: 'far',kind: 'repair',source: 'a',target: 'wall',position: { ...position,x: 14 },profile })).toThrow('range');
  world.queue({ id: 'a',kind: 'repair',source: 'a',target: 'wall',position,profile }); world.finish(['a']);
  const checkpoint = world.checkpoint(); const effect = checkpoint.effects[0]!; if (effect.kind !== 'repair') throw new Error('Expected repair effect'); effect.amount = 0;
  expect(() => createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects,checkpoint.ecology)).toThrow('energy/hits');
});
