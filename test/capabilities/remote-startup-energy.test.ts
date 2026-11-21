import { expect, test } from 'vitest';
import { createStartupEnergyLedger } from '../../src/capabilities/economy/startup/energy/ledger';
import { startupEnergyLayout } from '../fixtures/startup-energy';
test('ordered native-style charge consumes spawns before extensions atomically',() => {
  const model = createStartupEnergyLedger(startupEnergyLayout());
  expect(model.charge('spawn',450,0,'birth')).toBe(true);
  expect(model.result()).toMatchObject({ available: 50,charged: 450,points: [{ id: 'spawn',energy: 0 },{ id: 'second',energy: 0 },{ id: 'near',energy: 0 },{ id: 'far',energy: 50 }] });
  const before = model.checkpoint(); expect(model.charge('spawn',100,1,'too-large')).toBe(false); expect(model.checkpoint()).toEqual(before);
});
test('one destination cannot borrow another structure capacity and later birth frees only debited points',() => {
  const model = createStartupEnergyLedger(startupEnergyLayout()); model.charge('spawn',500,0,'initial');
  expect(model.deposit('spawn',400,1,'courier')).toBe(300); expect(model.deposit('spawn',100,1,'other')).toBe(0);
  expect(model.result().available).toBe(300); expect(model.charge('spawn',200,2,'next')).toBe(true);
  expect(model.deposit('spawn',300,2,'courier')).toBe(200); expect(model.result()).toMatchObject({ charged: 700,deposited: 500,available: 300 });
});
test('stock and incoming capacity reservations remain liabilities rather than free pooled stock',() => {
  const input = startupEnergyLayout(); input.structures[0]!.reservedEnergy = 100; input.structures[1]!.reservedCapacity = 50;
  const model = createStartupEnergyLedger(input), before = model.checkpoint();
  expect(model.available()).toBe(400); expect(model.charge('spawn',250,0,'would-steal')).toBe(false); expect(model.checkpoint()).toEqual(before);
  expect(model.charge('spawn',200,0,'safe')).toBe(true); expect(model.deposit('second',250,1,'cargo')).toBe(150);
});
test('declared alternate origin orders affect which physical structure is consumed',() => {
  const model = createStartupEnergyLedger(startupEnergyLayout()); model.charge('second',150,0,'body');
  expect(model.result().points.slice(0,2)).toEqual([{ id: 'spawn',energy: 250 },{ id: 'second',energy: 0 }]);
});
test('phase ordering and charge identity prevent same-frame deposits financing an earlier birth twice',() => {
  const model = createStartupEnergyLedger(startupEnergyLayout()); model.charge('spawn',100,0,'once');
  expect(() => model.charge('spawn',100,0,'once')).toThrow('Duplicate'); model.deposit('spawn',50,1,'cargo');
  expect(() => model.charge('spawn',50,1,'earlier')).toThrow('phase'); expect(model.charge('spawn',50,2,'later')).toBe(true);
});
test('JSON restore replays bounded events, rejects invented energy and does not duplicate charges',() => {
  const input = startupEnergyLayout(), model = createStartupEnergyLedger(input); model.charge('spawn',450,0,'body'); model.deposit('spawn',100,1,'cargo');
  const saved = JSON.parse(JSON.stringify(model.checkpoint())), resumed = createStartupEnergyLedger(input,saved); expect(resumed.result()).toEqual(model.result());
  const reordered = startupEnergyLayout(); reordered.structures.reverse();
  expect(createStartupEnergyLedger(reordered,saved).available()).toBe(model.available());
  saved.points[0].energy++; expect(() => createStartupEnergyLedger(input,saved)).toThrow('conservation');
  const changed = startupEnergyLayout(); changed.orders[0]!.structures = ['near','spawn','second','far']; expect(() => createStartupEnergyLedger(changed,model.checkpoint())).toThrow('binding');
});
test('invalid layouts, unknown endpoints and impossible reservations are refused',() => {
  const input = startupEnergyLayout(); input.structures[0]!.reservedEnergy = 301; expect(() => createStartupEnergyLedger(input)).toThrow('reservations');
  const model = createStartupEnergyLedger(startupEnergyLayout()); expect(() => model.deposit('missing',1,0,'cargo')).toThrow('Unknown');
});
