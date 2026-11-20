import { expect, test, vi } from 'vitest';
import * as allocation from '../../src/capabilities/spawning/allocate';
import * as mining from '../../src/capabilities/mining/step';
import { createStartupProject, forecastStartupProject, restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
function roundtrip<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function earningInput(horizon = 1700) {
  const input = startupDeliveryInput(); input.project.spawning.cash.horizon = horizon; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  input.project.spawning.requests = [...input.project.spawning.requests,{ ...input.project.spawning.requests[1]!,id: 'later',name: 'later',priority: 2,expiresAt: horizon+1 }];
  input.couriers = [...input.couriers,{ ...input.couriers[0]!,request: 'later' }];
  input.project.spawning.funding.refills = [{ id: 'distribution',energy: 50,firstTick: 0,interval: 1,occurrences: horizon+1 }]; return input;
}
test('JSON checkpoints resume directly from every frame of construction, mining and delivery',() => {
  const input = startupDeliveryInput(), expected = forecastStartupProject(input);
  for (let through = 0; through <= 101; through++) {
    const project = createStartupProject(input); project.advance(through); const checkpoint = roundtrip(project.checkpoint());
    const resumed = restoreStartupProject(input,checkpoint);
    expect(resumed.advance(0)).toMatchObject({ frames: 0,through,accountedThrough: through });
    resumed.advance(101-through); expect(resumed.result()).toEqual(expected);
  }
});
test('earned funding, retirement sentinels and settled receipts survive repeated resets',() => {
  const input = earningInput(), expected = forecastStartupProject(input); let project = createStartupProject(input), previous = 0;
  for (const through of [1,6,9,13,14,18,43,69,70,71,77,1499,1508,1600,1701]) {
    project.advance(through-previous); const wire = roundtrip(project.checkpoint()); project = restoreStartupProject(input,wire);
    expect(project.advance(0).through).toBe(through); previous = through;
  }
  expect(project.result()).toEqual(expected); expect(project.checkpoint().couriers.some(worker => worker.nextAt === null)).toBe(true);
});
test('receipts awaiting future settlement remain unavailable to early births after reset',() => {
  const input = earningInput(100); input.project.spawning.cash.homeEnergy = 400; input.project.spawning.funding.capacity = 400; input.project.spawning.funding.initialEnergy = 400;
  input.couriers = input.couriers.map(worker => ({ ...worker,deliveryTicks: 50 }));
  const expected = forecastStartupProject(input), project = createStartupProject(input); project.advance(50); const saved = roundtrip(project.checkpoint());
  expect(saved.due.length).toBeGreaterThan(0); const resumed = restoreStartupProject(input,saved); resumed.advance(51);
  expect(resumed.result()).toEqual(expected);
});
test('checkpoint input identity fences policy, schedule, stock, service, body and live names',() => {
  const input = earningInput(), project = createStartupProject(input); project.advance(20); const saved = project.checkpoint();
  const changes: ((input: ReturnType<typeof earningInput>) => void)[] = [
    input => { input.project.spawning.cash.protectedEnergy++; },input => { input.project.source.energy--; },
    input => { input.project.spawning.requests[0]!.body = [...input.project.spawning.requests[0]!.body].reverse(); },input => { input.couriers[0]!.returnTicks++; },
    input => { input.project.spawning.liveNames = new Set(['miner']); },input => { input.project.spawning.funding.refills = []; },
  ];
  for (const change of changes) { const changed = earningInput(); change(changed); expect(() => restoreStartupProject(changed,saved)).toThrow('checkpoint'); }
});
test('snapshots and completed results cannot mutate the live forecast',() => {
  const input = startupDeliveryInput(), project = createStartupProject(input); project.advance(10); const wire = project.checkpoint(), before = JSON.stringify(wire);
  wire.timeline.slots[0]!.availableAt = 999; wire.delivery.source.energy = 0; expect(JSON.stringify(project.checkpoint())).toBe(before);
  const restored = restoreStartupProject(input,project.checkpoint()); const saved = project.checkpoint(); saved.delivery.source.energy = 0;
  project.advance(91); restored.advance(91); const result = project.result(); result.delivery.source.energy = 0; result.delivery.receipts.length = 0;
  expect(project.result()).toEqual(restored.result());
});
test('changed serialization property order and live-name insertion order preserve the same input identity',() => {
  const input = startupDeliveryInput(); input.project.spawning.liveNames = new Set(['unused-a','unused-b']); const project = createStartupProject(input); project.advance(20);
  input.project.spawning.liveNames = new Set(['unused-b','unused-a']);
  const reordered = { ...input,container: Object.fromEntries(Object.entries(input.container).reverse()) as typeof input.container };
  expect(restoreStartupProject(reordered,roundtrip(project.checkpoint())).advance(1)).toMatchObject({ frames: 1,through: 21 });
});
test('invalid format, clocks, stock, duplicate births, ledger values and receipt identities fail closed',() => {
  const input = earningInput(), project = createStartupProject(input); project.advance(80); const saved = project.checkpoint();
  const changes = [
    (wire: typeof saved) => { wire.format = 2 as 1; },(wire: typeof saved) => { wire.tick++; },
    (wire: typeof saved) => { wire.delivery.source.energy = 1001; },(wire: typeof saved) => { wire.timeline.births.push(wire.timeline.births[0]!); },
    (wire: typeof saved) => { wire.houseAccounting.state.endingEnergy++; },(wire: typeof saved) => { wire.timeline.receiptIds.push('unexpected'); },
    (wire: typeof saved) => { wire.couriers[0]!.nextAt = null; },(wire: typeof saved) => { wire.sink.free = -1; },
    (wire: typeof saved) => { wire.container.hits = -1; },(wire: typeof saved) => { wire.sourceAccounting.tick--; },
  ];
  for (const change of changes) { const wire = roundtrip(saved); change(wire); expect(() => restoreStartupProject(input,wire)).toThrow('checkpoint'); }
  expect(project.checkpoint()).toEqual(saved);
});

test('restoration executes no allocation or mining frames before the caller advances',() => {
  const input = earningInput(), project = createStartupProject(input); project.advance(100); const saved = roundtrip(project.checkpoint());
  const allocate = vi.spyOn(allocation,'allocateSpawns'), mine = vi.spyOn(mining,'minerStep');
  try {
    const resumed = restoreStartupProject(input,saved); expect(allocate).not.toHaveBeenCalled(); expect(mine).not.toHaveBeenCalled();
    expect(resumed.advance(1)).toMatchObject({ frames: 1,through: 101 }); expect(allocate).toHaveBeenCalledTimes(1);
  } finally { allocate.mockRestore(); mine.mockRestore(); }
});
test.each(['destroyed','blocked','outside-income'])('reset preserves %s project outcomes',mode => {
  const input = earningInput(200);
  if (mode === 'destroyed') input.container = { ...input.container,hits: 5,decayAmount: 5,decayIn: 1,repairPolicy: null };
  if (mode === 'blocked') input.homeSink.freeCapacity = 0;
  if (mode === 'outside-income') input.project.spawning.cash.flows = [{ id: 'outside',kind: 'delivery',energy: 500,firstTick: 30,interval: null,occurrences: 1 }];
  const expected = forecastStartupProject(input); let project = createStartupProject(input);
  for (let frame = 0; frame < 201; frame++) { project.advance(1); project = restoreStartupProject(input,roundtrip(project.checkpoint())); }
  expect(project.result()).toEqual(expected);
});
test('conservation checks reject plausible single-field energy corruption',() => {
  const input = earningInput(), project = createStartupProject(input); project.advance(80); const saved = project.checkpoint();
  for (const change of [
    (wire: typeof saved) => { wire.delivery.source.energy--; },
    (wire: typeof saved) => { wire.delivery.containerEnergy++; },
    (wire: typeof saved) => { wire.construction.remainingProgress++; },
  ]) { const wire = roundtrip(saved); change(wire); expect(() => restoreStartupProject(input,wire)).toThrow('checkpoint'); }
});

test('explicit undefined optional input fields normalize to their existing defaults',() => {
  const input = startupDeliveryInput(); Object.assign(input.project.spawning.requests[0]!,{ placement: undefined,home: undefined });
  input.couriers.forEach(worker => Object.assign(worker,{ collectionTicks: undefined,deliveryTicks: undefined,initialOutboundTicks: undefined }));
  const project = createStartupProject(input); project.advance(50); const restored = restoreStartupProject(startupDeliveryInput(),roundtrip(project.checkpoint())); restored.advance(51);
  expect(restored.result()).toEqual(forecastStartupProject(startupDeliveryInput()));
});
test('reordered settlement history is rejected rather than returning nonchronological receipts',() => {
  const input = earningInput(), project = createStartupProject(input); project.advance(80); const saved = project.checkpoint();
  expect(saved.settled.length).toBeGreaterThan(1); saved.settled.reverse(); expect(() => restoreStartupProject(input,saved)).toThrow('checkpoint');
});
