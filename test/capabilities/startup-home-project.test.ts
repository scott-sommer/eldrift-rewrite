import { expect,test } from 'vitest';
import { startupHomeInput } from '../fixtures/startup-home';
import { createStartupHomeProject } from '../../src/capabilities/economy/startup/home/project';
test('two source inventories share one sink and receipt-funded home cash ledger',() => {
  const project = createStartupHomeProject(startupHomeInput()); project.advance(31); const result = project.result();
  expect(result.spawning.births).toEqual([]); expect(result.spawning.cash.birthEnergy).toBe(0);
  expect(result.spawning.cash.deliveredEnergy).toBe(50); expect(result.spawning.cash.endingEnergy).toBe(50);
  expect(result.sink.acceptedEnergy).toBe(50);
  expect(result.sources.map(source => source.delivery.receipts.map(receipt => [receipt.request,receipt.tick,receipt.energy]))).toEqual([[['a',7,32]],[['b',7,18]]]);
  expect(result.sources.map(source => source.delivery.courierCargoEnergy)).toEqual([0,14]);
});
test('bounded home advancement and caller mutation preserve the same joint result',() => {
  const input = startupHomeInput(),project = createStartupHomeProject(input),expected = createStartupHomeProject(startupHomeInput());
  input.sources[0]!.initial!.couriers[0]!.energy = 0; input.sink.freeCapacity = 0;
  for (let tick = 0; tick < 31; tick++) project.advance(1);
  expected.advance(31); expect(project.result()).toEqual(expected.result());
});
test('conflicting shared terrain and duplicate paid bodies cannot enter joint planning',() => {
  const input = startupHomeInput(); input.sources[1]!.motion.terrain[0]!.position = { ...input.sources[0]!.motion.terrain[0]!.position }; input.sources[1]!.motion.terrain[0]!.rate = 10;
  expect(() => createStartupHomeProject(input)).toThrow('Conflicting home terrain');
  const duplicate = startupHomeInput(); duplicate.sources[1]!.initial!.couriers[0]!.id = 'a';
  expect(() => createStartupHomeProject(duplicate)).toThrow();
});

test('source requests use one home spawn slot and each body is charged once',() => {
  const input = startupHomeInput(); input.spawning.cash.homeEnergy = 200;
  input.spawning.funding = { capacity: 200,initialEnergy: 200,refills: [] };
  input.spawning.requests = input.sources.map((source,index) => {
    const id = 'request:'+index,name = source.id;
    delete source.initial; delete source.motion.openings;
    source.requests = [id]; source.couriers = [{ request: id,outboundTicks: 2,returnTicks: 2,retireTicks: 10,minimumBatch: 1 }];
    source.motion.routes = source.motion.routes.map(route => ({ ...route,request: id,approach: { ...route.approach,unit: id },empty: { ...route.empty,unit: id },loaded: { ...route.loaded,unit: id } }));
    return { id,name,owner: 'paid-owner',room: 'W0N1',body: ['carry','move'],priority: index,readyAt: 0,expiresAt: 30 };
  });
  const project = createStartupHomeProject(input); project.advance(31); const result = project.result();
  expect(result.spawning.births.map(birth => [birth.startAt,birth.activeAt,birth.cost])).toEqual([[0,6,100],[6,12,100]]);
  expect(result.spawning.cash.birthEnergy).toBe(200); expect(result.spawning.cash.endingEnergy).toBe(0);
});
test('identical shared blocker facts are one occupant and still delay the affected source',() => {
  const input = startupHomeInput(),blocker = { unit: 'home-actor',position: { room: 'W0N1',x: 13,y: 25 },startAt: 2,endAt: 4 };
  for (const source of input.sources) source.motion.blockers = [blocker];
  const project = createStartupHomeProject(input); project.advance(31); const result = project.result();
  expect(result.sources[0]!.delivery.receipts.map(receipt => [receipt.tick,receipt.energy])).toEqual([[9,18]]);
  expect(result.sources[1]!.delivery.receipts.map(receipt => [receipt.tick,receipt.energy])).toEqual([[7,32]]);
  expect(result.spawning.cash.deliveredEnergy).toBe(50);
});
