import { constructionSite } from '../fixtures/construction-site';
import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
import { expiryEcology,expiryOrder,expiryPoses,expiryPosition,expiryStore } from '../fixtures/energy-expiry';

test('natural expiry removes the actor, retains cargo in a tombstone and resumes through released ground decay',() => {
  const world = createEnergyInventoryFrame(100,[expiryStore()],[],expiryEcology()); world.begin(100); world.finish([],expiryOrder,expiryPoses);
  const cp = JSON.parse(JSON.stringify(world.checkpoint())),resumed = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology);
  expect(cp.stores).toEqual([]); expect(cp.ecology.tombstones[0]).toMatchObject({ energy: 20,remaining: 14,createdAt: 101 });
  for (let tick = 101; tick <= 114; tick++) { resumed.begin(tick); resumed.finish([],expiryOrder); }
  expect(resumed.ecologySnapshot().ground).toEqual([{ position: expiryPosition,energy: 20 }]);
  resumed.begin(115); expect(resumed.observe('unit')).toBeUndefined(); expect(resumed.tombstone('forecast:tomb')).toBeUndefined(); resumed.finish([]);
  expect(resumed.ecologySnapshot().ground[0]!.energy).toBe(19);
});

test('last-frame transfers stay valid witnesses after their actor dies, but the dead actor cannot issue again',() => {
  const world = createEnergyInventoryFrame(100,[expiryStore(),expiryStore('bank',0,100)],[],expiryEcology()); world.begin(100);
  world.queue({ id: 'last',kind: 'transfer',source: 'unit',target: 'bank',amount: 20 }); world.finish(['last'],expiryOrder,expiryPoses);
  const cp = world.checkpoint(),resumed = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); resumed.begin(101);
  expect(resumed.effect('last')).toMatchObject({ amount: 20 }); expect(resumed.tombstone('forecast:tomb')!.energy).toBe(0);
  expect(() => resumed.queue({ id: 'again',kind: 'transfer',source: 'unit',target: 'bank',amount: 1 })).toThrow('endpoints');
});

test('withdrawal clips to tombstone stock and remains valid across its same-frame expiration',() => {
  const ecology = expiryEcology(); ecology.bodies![0]!.tombstoneDecay = 2;
  const world = createEnergyInventoryFrame(100,[expiryStore(),expiryStore('rescuer',45)],[],ecology); world.begin(100); world.finish([],expiryOrder,expiryPoses);
  world.begin(101); world.queue({ id: 'take',kind: 'withdraw',source: 'forecast:tomb',target: 'rescuer',amount: 20 }); world.finish(['take'],expiryOrder);
  expect(world.snapshot()[0]!.energy).toBe(50); expect(world.ecologySnapshot().ground[0]!.energy).toBe(15);
  const cp = world.checkpoint(),resumed = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); resumed.begin(102); expect(resumed.effect('take')).toMatchObject({ amount: 5 });
  expect(() => resumed.queue({ id: 'stale',kind: 'withdraw',source: 'forecast:tomb',target: 'rescuer',amount: 1 })).toThrow('endpoints');
});

test('missing final poses, mixed cargo and corrupt lifetime clocks refuse without committing a partial death',() => {
  const world = createEnergyInventoryFrame(100,[expiryStore()],[],expiryEcology()); world.begin(100);
  expect(() => world.finish([],expiryOrder)).toThrow('positions'); expect(world.observe('unit')!.energy).toBe(20);
  const mixed = createEnergyInventoryFrame(100,[{ ...expiryStore(),usedCapacity: 25,freeEnergyCapacity: 25 }],[],expiryEcology()); mixed.begin(100);
  expect(() => mixed.finish([],expiryOrder,expiryPoses)).toThrow('physical resource model'); expect(mixed.observe('unit')!.usedCapacity).toBe(25);
  world.finish([],expiryOrder,expiryPoses); const cp = world.checkpoint(); cp.ecology!.tombstones![0]!.remaining--;
  expect(() => createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology)).toThrow('countdown');
});

test.each(['harvest','repair','build'])('a final %s action retains its physical witness after actor expiry',kind => {
  const ecology = expiryEcology();
  ecology.sources = [{ id: 'source',position: { ...expiryPosition,y: 11 },energy: 100,capacity: 1500,regenerationIn: null,regenerationTicks: 300 }];
  ecology.structures = [{ id: 'wall',position: expiryPosition,hits: 1,hitsMax: 1000,repairable: true }]; ecology.sites = [constructionSite(expiryPosition)];
  const world = createEnergyInventoryFrame(100,[expiryStore()],[],ecology); world.begin(100);
  if (kind === 'harvest') world.queue({ id: kind,kind,source: 'source',target: 'unit',position: expiryPosition,amount: 2 });
  else if (kind === 'repair') world.queue({ id: kind,kind,source: 'unit',target: 'wall',position: expiryPosition,profile: { workParts: 1,boostBonuses: [] } });
  else world.queue({ id: kind,kind: 'build',source: 'unit',target: 'site',position: expiryPosition,allowed: true,profile: { workParts: 1,boostBonuses: [] } });
  world.finish([kind],expiryOrder,expiryPoses);
  const cp = world.checkpoint(),resumed = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); resumed.begin(101);
  expect(resumed.effect(kind)!.kind).toBe(kind); expect(resumed.observe('unit')).toBeUndefined();
});
