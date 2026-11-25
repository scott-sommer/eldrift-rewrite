import { expect, test } from 'vitest';
import { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
import { createStartupProject } from '../../src/capabilities/economy/startup/project';
import type { StartupHouseholdInput } from '../../src/capabilities/economy/startup/household/model';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
function fixture(kind: 'build' | 'upgrade' = 'upgrade'): StartupHouseholdInput {
  const input = startupPassiveProject(), spawning = input.project.spawning;
  spawning.requests = spawning.requests.filter(request => request.id === 'miner');
  return { spawning,endpointEnergy: 700,endpointCapacity: 730,redistribution: { horizon: 100,trips: [] },labor: { horizon: 100,jobs: [
    { id: 'work',request: 'miner',kind,pickupAt: 9,outboundTicks: 2,workTicks: 2,returnTicks: 1,energy: 10 },
  ] } };
}
function advance(model: ReturnType<typeof createStartupHousehold>, from: number, through: number) {
  for (let tick = from; tick <= through; tick++) { model.begin(tick); model.finish(); }
}
test.each([['upgrade',2],['build',10]] as const)('funded %s work spends cargo once, preserves point stock and resumes through all three ledgers', (kind,spent) => {
  const input = fixture(kind), full = createStartupHousehold(input); advance(full,0,100); const expected = full.result();
  expect(expected.cash).toMatchObject({ birthEnergy: 200,homeConstructionEnergy: kind === 'build' ? spent : 0,upkeepEnergy: kind === 'build' ? 0 : spent,deliveredEnergy: 0,ambientEnergy: 101,endingEnergy: 901-spent });
  expect(expected.redistribution.endpointEnergy).toBe(700-spent); expect(expected.labor!.jobs[0]).toMatchObject({ picked: 10,spent,returned: 10-spent,cargo: 0 });
  let model = createStartupHousehold(input);
  for (let tick = 0; tick <= 100; tick++) { advance(model,tick,tick); const saved = JSON.parse(JSON.stringify(model.checkpoint())); expect(saved.format).toBe(5); model = createStartupHousehold(input,saved); }
  expect(model.result()).toEqual(expected);
});
test('incoming endpoint credit reserves space before labor returns, which retry without creating income',() => {
  const input = fixture(); input.endpointCapacity = 700;
  input.spawning.cash.flows = [{ id: 'bill',kind: 'upkeep',spending: 'outside-spawn',energy: 5,firstTick: 20,interval: null,occurrences: 1 }];
  let model = createStartupHousehold(input);
  for (let tick = 0; tick <= 100; tick++) {
    model.begin(tick); model.finish(tick === 15 ? [{ id: 'receipt',tick,energy: 10 }] : []);
    if (tick === 15) expect(model.checkpoint().labor!.jobs[0]).toMatchObject({ phase: 'returning',cargo: 8,returned: 0 });
    if (tick === 20) model = createStartupHousehold(input,model.checkpoint());
  }
  expect(model.result().labor!.jobs[0]).toMatchObject({ phase: 'returning',cargo: 3,returned: 5,spent: 2 });
  expect(model.result().cash).toMatchObject({ deliveredEnergy: 10,upkeepEnergy: 7,endingEnergy: 904 });
});
test('labor expiry loss is charged once and cannot disappear from a restored funding ledger',() => {
  const input = fixture(); input.spawning.cash.horizon = 1520; input.redistribution.horizon = 1520; input.labor!.horizon = 1520; input.labor!.jobs = [{ ...input.labor!.jobs[0]!,pickupAt: 1507,outboundTicks: 2 }];
  let model = createStartupHousehold(input); advance(model,0,1508); const saved = model.checkpoint();
  expect(saved.labor!.jobs[0]).toMatchObject({ phase: 'expired',lost: 10,spent: 0 }); expect(saved.losses).toHaveLength(1);
  model = createStartupHousehold(input,saved); advance(model,1509,1520); expect(model.result().cash).toMatchObject({ upkeepEnergy: 10,endingEnergy: 990 });
  const wrong = JSON.parse(JSON.stringify(saved)); wrong.losses = []; expect(() => createStartupHousehold(input,wrong)).toThrow();
});
test('checkpoint parent links reject forged endpoint/birth facts; full-project labor is explicitly unavailable',() => {
  const input = fixture(), model = createStartupHousehold(input); advance(model,0,12); const saved = model.checkpoint();
  const wrong = JSON.parse(JSON.stringify(saved)); wrong.endpointEnergy++; expect(() => createStartupHousehold(input,wrong)).toThrow('conservation');
  const changed = JSON.parse(JSON.stringify(saved)); changed.labor.jobs[0].worker.birth.spawn = 'other'; expect(() => createStartupHousehold(input,changed)).toThrow('paid-birth');
  const shared = fixture(); shared.redistribution.trips = [{ id: 'shared',request: 'miner',pickupAt: 9,loadedTicks: 1,returnTicks: 1,energy: 10 }];
  expect(() => createStartupHousehold(shared)).toThrow('share a body');
  const unfunded = fixture(); unfunded.spawning.cash.flows = [{ id: 'bill',kind: 'upkeep',spending: 'outside-spawn',energy: 700,firstTick: 10,interval: null,occurrences: 1 }];
  const pending = createStartupHousehold(unfunded); advance(pending,0,9); const before = pending.checkpoint();
  expect(() => pending.begin(10)).toThrow('endpoint'); expect(pending.checkpoint()).toEqual(before);
  const project = startupPassiveProject(); project.household = { ...project.household!,labor: input.labor!,endpointCapacity: 730 };
  expect(() => createStartupProject(project)).toThrow('not yet supported');
});
