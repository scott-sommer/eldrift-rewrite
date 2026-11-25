import { expect, test, vi } from 'vitest';
import { createStartupEnergyLedger } from '../../src/capabilities/economy/startup/energy/ledger';
import * as regeneration from '../../src/capabilities/economy/startup/energy/regeneration';
import type { StartupEnergyLayout } from '../../src/capabilities/economy/startup/energy/model';
function input(): StartupEnergyLayout {
  return { structures: [{ id: 'a',kind: 'spawn',energy: 150,capacity: 300 },{ id: 'b',kind: 'spawn',energy: 149,capacity: 300 }],orders: [{ spawn: 'a',structures: ['a','b'] }],regeneration: { eligibleSpawns: ['a','b'],otherRoomEnergy: 0 } };
}
test('physical passive settlement uses one frozen snapshot and closes the action phase',() => {
  const model = createStartupEnergyLedger(input()); expect(model.regenerate(0)).toBe(2);
  expect(model.result()).toMatchObject({ available: 301,ambientEnergy: 2,points: [{ id: 'a',energy: 151 },{ id: 'b',energy: 150 }] });
  expect(() => model.charge('a',1,0,'late')).toThrow('frame'); expect(() => model.deposit('a',1,0,'late')).toThrow('frame');
  expect(() => model.regenerate(0)).toThrow('frame'); expect(model.regenerate(1)).toBe(0);
  const resumed = createStartupEnergyLedger(input(),JSON.parse(JSON.stringify(model.checkpoint()))); expect(resumed.checkpoint()).toEqual(model.checkpoint());
  const reordered = input(); reordered.structures = [...reordered.structures].reverse(); reordered.regeneration!.eligibleSpawns = ['b','a'];
  expect(createStartupEnergyLedger(reordered,model.checkpoint()).result().ambientEnergy).toBe(2);
});
test('automatic credit can occupy reserved incoming space but later deposits cannot borrow it again',() => {
  const view = input(); view.structures = [{ id: 'a',kind: 'spawn',energy: 299,capacity: 300,reservedCapacity: 1 }]; view.regeneration!.eligibleSpawns = ['a']; view.orders = [{ spawn: 'a',structures: ['a'] }];
  const model = createStartupEnergyLedger(view); expect(model.regenerate(0)).toBe(1); expect(model.deposit('a',50,1,'cargo')).toBe(0);
  expect(model.charge('a',2,1,'birth')).toBe(true); expect(model.deposit('a',50,1,'cargo')).toBe(1); expect(model.regenerate(1)).toBe(1);
  expect(model.result()).toMatchObject({ available: 300,ambientEnergy: 2,charged: 2,deposited: 1 });
  expect(createStartupEnergyLedger(view,model.checkpoint()).result()).toEqual(model.result());
});
test('restore refuses omitted or invented ambient credit and a downgraded checkpoint',() => {
  const view = input(), model = createStartupEnergyLedger(view); model.regenerate(0);
  const omitted = model.checkpoint(); omitted.events = []; omitted.points = view.structures.map(point => ({ id: point.id,energy: point.energy })); expect(() => createStartupEnergyLedger(view,omitted)).toThrow('Missing');
  const invented = model.checkpoint(); invented.events[0]!.energy++; expect(() => createStartupEnergyLedger(view,invented)).toThrow('conservation');
  const old = model.checkpoint(); old.format = 1; expect(() => createStartupEnergyLedger(view,old)).toThrow('binding');
});
test('a long quiet checkpoint restores without elapsed-frame replay and binds regeneration assumptions',() => {
  const view = input(); view.regeneration!.otherRoomEnergy = 1;
  const saved = createStartupEnergyLedger(view).checkpoint(); saved.ambientThrough = 10000;
  const quote = vi.spyOn(regeneration,'quoteStartupSpawnRegeneration');
  try { expect(createStartupEnergyLedger(view,saved).checkpoint().ambientThrough).toBe(10000); expect(quote.mock.calls.length).toBeLessThan(3); }
  finally { quote.mockRestore(); }
  view.regeneration!.otherRoomEnergy = 0; expect(() => createStartupEnergyLedger(view,saved)).toThrow('binding');
});
