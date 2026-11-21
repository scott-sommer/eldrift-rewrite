import { expect, test } from 'vitest';
import { createStartupRedistribution } from '../../src/capabilities/economy/startup/redistribution/transfer';
import type { StartupRedistributionInput, StartupRedistributionPorts, StartupRedistributionWorker } from '../../src/capabilities/economy/startup/redistribution/model';
function fixture(input: StartupRedistributionInput = { horizon: 10,trips: [{ id: 'trip',request: 'paid',pickupAt: 0,loadedTicks: 1,returnTicks: 1,energy: 50 }] }) {
  const stock = { endpoint: 200,spawn: 100,capacity: 200,bank: 300 }, workers = new Map<string,StartupRedistributionWorker>([['paid',{ activeAt: 0,expiresAt: 20,capacity: 50 }]]);
  const ports: StartupRedistributionPorts = { worker: id => workers.get(id),
    withdraw: maximum => { const amount = Math.min(maximum,stock.endpoint); stock.endpoint -= amount; return amount; },
    deposit: maximum => { const amount = Math.min(maximum,stock.capacity-stock.spawn); stock.spawn += amount; return amount; },lose: amount => { stock.bank -= amount; } };
  return { stock,workers,ports,input,model: createStartupRedistribution(input,ports) };
}
test('only actually picked energy reaches spawn after travel without creating household cash',() => {
  const f = fixture(); expect(f.model.step(0)).toEqual({ withdrawn: 50,delivered: 0,lost: 0,missed: 0 });
  expect(f.stock.spawn).toBe(100); expect(f.model.step(1).delivered).toBe(0); expect(f.model.step(2).delivered).toBe(50);
  expect(f.stock).toMatchObject({ endpoint: 150,spawn: 150,bank: 300 }); expect(f.model.result()).toEqual({ cargo: 0,picked: 50,delivered: 50,lost: 0 });
});
test('income arriving after an empty pickup cannot retroactively finance that trip',() => {
  const f = fixture(); f.stock.endpoint = 0; f.stock.bank = 100;
  expect(f.model.step(0).missed).toBe(1); f.stock.endpoint = 100; f.stock.bank += 100;
  f.model.step(1); f.model.step(2); expect(f.stock.spawn).toBe(100); expect(f.model.result().delivered).toBe(0);
});
test('missing or not-yet-ready paid worker facts cannot provide free transport',() => {
  for (const activeAt of [3,undefined]) {
    const f = fixture(); if (activeAt === undefined) f.workers.clear(); else f.workers.get('paid')!.activeAt = activeAt;
    expect(f.model.step(0).missed).toBe(1); f.model.step(1); f.model.step(2); expect(f.stock.endpoint).toBe(200); expect(f.model.result().picked).toBe(0);
  }
});
test('partial spawn acceptance retains cargo and loaded expiry reports only the remaining loss',() => {
  const f = fixture(); f.stock.capacity = 120; f.workers.get('paid')!.expiresAt = 4;
  f.model.step(0); f.model.step(1); expect(f.model.step(2).delivered).toBe(20); expect(f.model.result().cargo).toBe(30);
  expect(f.model.step(3).delivered).toBe(0); expect(f.model.step(4).lost).toBe(30);
  expect(f.model.result()).toEqual({ cargo: 0,picked: 50,delivered: 20,lost: 30 }); expect(f.stock.bank).toBe(270);
  expect(f.stock.endpoint+f.stock.spawn).toBe(f.stock.bank);
});
test('the last alive action may deliver, while an arrival at expiry cannot',() => {
  const f = fixture(); f.workers.get('paid')!.expiresAt = 3; f.model.step(0); f.model.step(1);
  expect(f.model.step(2).delivered).toBe(50); expect(f.model.step(3).lost).toBe(0);
  const late = fixture(); late.workers.get('paid')!.expiresAt = 2; late.model.step(0); late.model.step(1); expect(late.model.step(2)).toMatchObject({ delivered: 0,lost: 50 });
});
test('overlapping trips and the quoted return leg cannot double-use a worker',() => {
  const input: StartupRedistributionInput = { horizon: 10,trips: [0,1,3,4].map((pickupAt,index) => ({ id: String(index),request: 'paid',pickupAt,loadedTicks: 1,returnTicks: 1,energy: 25 })) };
  const f = fixture(input); f.model.step(0); expect(f.model.step(1).missed).toBe(1); expect(f.model.step(2).delivered).toBe(25);
  expect(f.model.step(3).missed).toBe(1); expect(f.model.step(4).withdrawn).toBe(25);
});
test('actual worker capacity and endpoint stock cap the pickup, and a horizon cannot credit future delivery',() => {
  const f = fixture({ horizon: 1,trips: [{ id: 'small',request: 'paid',pickupAt: 0,loadedTicks: 1,returnTicks: 0,energy: 100 }] });
  f.workers.get('paid')!.capacity = 25; f.stock.endpoint = 20;
  expect(f.model.step(0).withdrawn).toBe(20); f.model.step(1); expect(f.model.result()).toEqual({ cargo: 20,picked: 20,delivered: 0,lost: 0 }); expect(() => f.model.step(2)).toThrow('order');
});
test('JSON checkpoints preserve in-flight cargo and do not repeat pickup or create a second credit',() => {
  const f = fixture(); f.model.step(0); const wire = JSON.parse(JSON.stringify(f.model.checkpoint())), model = createStartupRedistribution(f.input,f.ports,wire);
  expect(() => model.step(0)).toThrow('order'); model.step(1); expect(model.step(2).delivered).toBe(50); model.step(3);
  expect(f.stock).toMatchObject({ endpoint: 150,spawn: 150,bank: 300 }); expect(model.result().delivered).toBe(50);
  wire.trips[0].cargo = 500; expect(model.result().cargo).toBe(0);
});
test('checkpoint binding, conservation, version and invalid port effects fail closed',() => {
  const f = fixture(); f.model.step(0); const saved = f.model.checkpoint();
  expect(() => createStartupRedistribution({ ...f.input,horizon: 9 },f.ports,saved)).toThrow('binding');
  expect(() => createStartupRedistribution(f.input,f.ports,{ ...saved,format: 2 as 1 })).toThrow('binding');
  const bad = JSON.parse(JSON.stringify(saved)); bad.trips[0].cargo++; expect(() => createStartupRedistribution(f.input,f.ports,bad)).toThrow('conservation');
  const other = fixture(); const invalid = createStartupRedistribution(other.input,{ ...other.ports,withdraw: maximum => maximum+1 }); expect(() => invalid.step(0)).toThrow('effect');
});
test('invalid trip bounds and duplicate identities are refused before any transfer',() => {
  const f = fixture(), trip = f.input.trips[0]!;
  expect(() => createStartupRedistribution({ horizon: 10,trips: [trip,trip] },f.ports)).toThrow('identities');
  expect(() => createStartupRedistribution({ horizon: 10,trips: [{ ...trip,loadedTicks: -1 }] },f.ports)).toThrow('trip');
  expect(f.stock.endpoint).toBe(200);
});

test('restore preserves quoted arrival and return travel instead of accepting a teleporting worker',() => {
  const f = fixture(); f.model.step(0); f.model.step(1); f.model.step(2);
  const saved = f.model.checkpoint(), missing = JSON.parse(JSON.stringify(saved)); missing.busy = [];
  expect(() => createStartupRedistribution(f.input,f.ports,missing)).toThrow('occupancy');
  const early = JSON.parse(JSON.stringify(saved)); early.trips[0].arrivalAt = 0;
  expect(() => createStartupRedistribution(f.input,f.ports,early)).toThrow('phase');
  expect(createStartupRedistribution({ trips: f.input.trips,horizon: f.input.horizon },f.ports,saved).result()).toEqual(f.model.result());
});
