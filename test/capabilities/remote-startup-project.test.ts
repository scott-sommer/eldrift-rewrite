import { expect, test } from 'vitest';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { forecastStartupProject, createStartupProject } from '../../src/capabilities/economy/startup/project';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
function earningInput() {
  const view = startupDeliveryInput(); view.project.source.energy = 1000; view.project.source.capacity = 1000; view.project.spawning.cash.horizon = 150;
  view.project.spawning.requests = [...view.project.spawning.requests,{ ...view.project.spawning.requests[1]!,id: 'later',name: 'later',priority: 2,expiresAt: 200 }];
  view.couriers = [...view.couriers,{ ...view.couriers[0]!,request: 'later' }];
  view.project.spawning.funding.refills = [{ id: 'distribution',energy: 50,firstTick: 0,interval: 1,occurrences: 151 }];
  return view;
}
test('forward construction, source effects, finite delivery and maintenance match the funded static composition',() => {
  const view = startupDeliveryInput(), fixed = forecastStartupDelivery(view), forward = forecastStartupProject(view);
  expect(forward.spawning.births).toEqual(fixed.spawning.births);
  expect(forward.construction).toEqual(fixed.construction); expect(forward.delivery).toEqual(fixed.delivery);
  expect(forward.cash).toEqual(fixed.cash); expect(forward.maintenance).toEqual(fixed.maintenance);
  expect(forward.spawning.cash.endingEnergy).toBe(forward.cash.endingEnergy);
});
test('earned deliveries and later explicit redistribution finance a body that static funding cannot admit',() => {
  const view = earningInput(), result = forecastStartupProject(view);
  expect(forecastStartupDelivery(view).spawning.unscheduled).toContainEqual({ request: 'later',reason: 'horizon' });
  expect(result.delivery.receipts.slice(0,2).map(receipt => [receipt.tick,receipt.energy])).toEqual([[43,50],[69,50]]);
  expect(result.spawning.births.find(birth => birth.request === 'later')).toMatchObject({ startAt: 71,activeAt: 77,cost: 100 });
  expect(result.spawning.cash.homeShortfall).toBe(0); expect(result.cash.birthEnergy).toBe(400);
  expect(result.cash.endingEnergy).toBe(300-400+result.delivery.deliveredEnergy);
});
test('banked earnings cannot bypass inaccessible spawn stock when no distribution is supplied',() => {
  const view = earningInput(); view.project.spawning.funding.refills = [];
  const result = forecastStartupProject(view);
  expect(result.delivery.deliveredEnergy).toBeGreaterThanOrEqual(100);
  expect(result.spawning.unscheduled).toContainEqual({ request: 'later',reason: 'horizon' });
});
test('empty bootstrap cannot finance itself with hypothetical future workers or receipts',() => {
  const view = earningInput(); view.project.spawning.cash.homeEnergy = 0; view.project.spawning.funding.initialEnergy = 0;
  const result = forecastStartupProject(view);
  expect(result.spawning.births).toEqual([]); expect(result.delivery.deliveredEnergy).toBe(0);
  expect(result.construction.completeAt).toBeNull(); expect(result.cash).toMatchObject({ birthEnergy: 0,endingEnergy: 0 });
});
test('blocked home acceptance prevents earned-income recruitment despite active remote production',() => {
  const view = earningInput(); view.homeSink.freeCapacity = 0;
  const result = forecastStartupProject(view);
  expect(result.delivery.harvestedEnergy).toBeGreaterThan(0); expect(result.delivery.deliveredEnergy).toBe(0);
  expect(result.spawning.unscheduled).toContainEqual({ request: 'later',reason: 'horizon' });
});
test('bounded guarded execution resumes deterministically from a detached input snapshot',() => {
  const view = earningInput(), expected = forecastStartupProject(view), project = createStartupProject(view);
  expect(project.advance(5)).toMatchObject({ frames: 5,through: 5,done: false });
  expect(project.advance(100,() => false)).toMatchObject({ frames: 0,through: 5,done: false });
  expect(() => project.result()).toThrow('incomplete');
  view.project.source.energy = 0; view.homeSink.freeCapacity = 0; view.project.spawning.requests = [];
  while (!project.advance(7).done) { /* Explicit bounded batches until the same quoted horizon. */ }
  expect(project.result()).toEqual(expected);
});
test('later miner and courier service can be paid from prior earned income without a free replacement wave',() => {
  const view = startupDeliveryInput(); view.project.spawning.cash.horizon = 1700; view.project.source.energy = 1000; view.project.source.capacity = 1000;
  const miner = view.project.spawning.requests[0]!, courier = view.project.spawning.requests[1]!;
  view.project.spawning.requests = [...view.project.spawning.requests,{ ...miner,id: 'miner-next',name: 'miner-next',readyAt: 1490,expiresAt: 1701 },
    { ...courier,id: 'courier-next',name: 'courier-next',readyAt: 1490,expiresAt: 1701 }];
  view.project.workers = [...view.project.workers,{ ...view.project.workers[0]!,request: 'miner-next' }];
  view.couriers = [...view.couriers,{ ...view.couriers[0]!,request: 'courier-next' }];
  view.project.spawning.funding.refills = [{ id: 'distribution',energy: 50,firstTick: 0,interval: 1,occurrences: 1701 }];
  const result = forecastStartupProject(view), c = result.construction, d = result.delivery;
  expect(result.spawning.births.map(birth => birth.request)).toEqual(['miner','courier','miner-next','courier-next']);
  expect(result.cash).toMatchObject({ birthEnergy: 600,homeShortfall: 0 });
  expect(c.harvestedEnergy+d.harvestedEnergy).toBe(c.constructionEnergy+d.deliveredEnergy+d.containerEnergy+d.minerCargoEnergy+d.courierCargoEnergy+d.unusedMinerCargoEnergy+d.uncapturedOverflowEnergy+d.unreturnedCourierEnergy+result.maintenance.repairEnergy+result.maintenance.unrecoveredEnergy);
});
test('finite infrastructure failure cannot produce the income needed for a later body',() => {
  const view = earningInput(); view.container = { ...view.container,hits: 5,decayAmount: 5,decayIn: 1,repairPolicy: null };
  const result = forecastStartupProject(view);
  expect(result.maintenance.destroyedAt).toBe(14); expect(result.delivery.deliveredEnergy).toBe(0);
  expect(result.spawning.unscheduled).toContainEqual({ request: 'later',reason: 'horizon' });
});
test('invalid budgets and unsupported source-worker overlap cannot certify a future schedule',() => {
  const view = earningInput(), project = createStartupProject(view);
  expect(() => project.advance(Infinity)).toThrow('budget'); expect(() => project.advance(-1)).toThrow('budget');
  const miner = view.project.spawning.requests[0]!;
  view.project.spawning.cash.homeEnergy = 500; view.project.spawning.funding.initialEnergy = 500; view.project.spawning.funding.capacity = 500;
  view.project.spawning.requests = [...view.project.spawning.requests,{ ...miner,id: 'overlap',name: 'overlap',readyAt: 30,expiresAt: 200 }];
  view.project.workers = [...view.project.workers,{ ...view.project.workers[0]!,request: 'overlap' }];
  expect(() => forecastStartupProject(view)).toThrow('handoff');
});

test('outside income may finance workers but cannot be claimed as this source project recovery',() => {
  const view = earningInput(); view.homeSink.freeCapacity = 0;
  view.project.spawning.cash.flows = [{ id: 'outside-income',kind: 'delivery',energy: 500,firstTick: 30,interval: null,occurrences: 1 }];
  const result = forecastStartupProject(view);
  expect(result.spawning.births.some(birth => birth.request === 'later')).toBe(true);
  expect(result.cash).toMatchObject({ deliveredEnergy: 500,birthEnergy: 400,homeShortfall: 0,homeCashSurplus: 100 });
  expect(result.delivery.deliveredEnergy).toBe(0);
  expect(result.projectCash).toMatchObject({ deliveredEnergy: 0,birthEnergy: 400,homeCashSurplus: -400,constructionRecoveryMargin: -404,firstRecoveryAt: null });
});

test('late-settling receipts cannot fund early bodies even when an earlier action emitted them first',() => {
  const view = earningInput(); view.project.spawning.cash.horizon = 100;
  view.project.spawning.cash.homeEnergy = 400; view.project.spawning.funding.capacity = 400; view.project.spawning.funding.initialEnergy = 400;
  view.project.spawning.spawns = [{ id: 'a',room: 'home',availableAt: 0 },{ id: 'b',room: 'home',availableAt: 0 }];
  const base = view.project.spawning.requests[1]!;
  view.project.spawning.requests = [view.project.spawning.requests[0]!,base,{ ...base,id: 'second',name: 'second',priority: 2 },{ ...base,id: 'future',name: 'future',priority: 3 }];
  view.couriers = [{ ...view.couriers[0]!,deliveryTicks: 50 },{ ...view.couriers[0]!,request: 'second' },{ ...view.couriers[0]!,request: 'future' }];
  const project = createStartupProject(view);
  expect(project.advance(70)).toMatchObject({ through: 70,accountedThrough: 70,done: false });
  project.advance(31); const result = project.result();
  expect(result.delivery.receipts.map(receipt => [receipt.tick,receipt.energy])).toEqual([[69,50],[92,50],[95,50]]);
  expect(result.spawning.births.find(birth => birth.request === 'future')?.startAt).toBe(94);
});
test('household recovery waits for actual construction readiness rather than clamping an earlier crossing',() => {
  const view = earningInput(); view.project.spawning.requests = view.project.spawning.requests.filter(request => request.id !== 'later');
  view.couriers = view.couriers.filter(worker => worker.request !== 'later');
  view.project.spawning.cash.flows = [{ id: 'outside',kind: 'delivery',energy: 500,firstTick: 1,interval: null,occurrences: 1 }];
  const recovered = forecastStartupProject(view);
  expect(recovered.spawning.cash.firstRecoveryAt).toBe(1); expect(recovered.cash.firstRecoveryAt).toBe(13);
  view.project.spawning.cash.flows = [...view.project.spawning.cash.flows,{ id: 'expense',kind: 'upkeep',energy: 600,firstTick: 12,interval: null,occurrences: 1 }];
  const interrupted = forecastStartupProject(view);
  expect(interrupted.spawning.cash.firstRecoveryAt).toBe(1); expect(interrupted.cash.firstRecoveryAt).toBeNull();
});
