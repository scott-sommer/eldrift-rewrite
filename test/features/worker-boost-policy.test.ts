import { expect, test } from 'vitest';
import { createWorkerBoostPolicy } from '../../src/features/industry/boosts/worker-policy';
import { reconcileWorkerPopulation } from '../../src/features/work/population';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const required = { workerBoostPolicy: 'required' as const,workerBoostTimeout: 80 }, price = { mineral: 30,energy: 20 };
const body = ['work','work','carry','move'] as const;
test('one whole kit funds only one new worker, while optional shortage permits explicit unboosted fallback',() => {
  const choose = createWorkerBoostPolicy(required,{ minerals: { GH2O: 60 },energy: 40 },price);
  expect(choose('upgrader',body)).toEqual({ steps: [{ part: 'work',resource: 'GH2O',count: 2 }],required: true,timeout: 80 });
  expect(choose('upgrader',body)).toBe('wait');
  expect(createWorkerBoostPolicy({ ...required,workerBoostPolicy: 'optional' },{ minerals: {},energy: 0 },price)('upgrader',body)).toBeNull();
});
test('lab-local mineral/energy funds its matching effect without promising energy trapped in another lab',() => {
  const choose = createWorkerBoostPolicy(required,{ minerals: {},energy: 0,local: { GH2O: { mineral: 60,energy: 40 },ZO: { mineral: 30,energy: 40 } } },price);
  expect(choose('upgrader',body)).toMatchObject({ steps: [{ resource: 'GH2O',count: 2 }] });
  expect(choose('upgrader',body)).toBe('wait');
  const trapped = createWorkerBoostPolicy(required,{ minerals: {},energy: 0,local: { GH2O: { mineral: 60,energy: 0 },ZO: { mineral: 30,energy: 40 } } },price);
  expect(trapped('upgrader',body)).toBe('wait');
});
test('builder uses legacy travel/carry/build effects and shares bank energy across all three',() => {
  const stock = { ZO: 30,KH: 30,LH: 60 };
  const select = (energy: number) => createWorkerBoostPolicy(required,{ minerals: stock,energy },price)('builder',body);
  expect(select(80)).toMatchObject({ steps: [{ part: 'move',resource: 'ZO',count: 1 },{ part: 'carry',resource: 'KH',count: 1 },{ part: 'work',resource: 'LH',count: 2 }] });
  expect(select(79)).toBe('wait');
});
test('fortifier and off policy do not invent legacy boost demands',() => {
  expect(createWorkerBoostPolicy(required,{ minerals: {},energy: 0 },price)('fortifier',body)).toBeNull();
  expect(createWorkerBoostPolicy({ ...required,workerBoostPolicy: 'off' },{ minerals: {},energy: 0 },price)('upgrader',body)).toBeNull();
});
test('lazy birth selection debits only actual new requests, does not replace queued identities, and waits without allocating more',() => {
  const memory = {}, state = createMemoryPort(() => memory), queue = createSpawnQueue(state,'W0N1');
  const plan = { room: 'W0N1',level: 6,enabled: true,budget: 300,fallback: 'upgrader' as const,targets: { builder: 0,fortifier: 0,upgrader: 2 },
    selectBirthBoost: createWorkerBoostPolicy(required,{ minerals: { GH2O: 30 },energy: 20 },price) };
  reconcileWorkerPopulation(state,plan,[],1);
  expect(queue.list()).toHaveLength(1); expect(queue.list()[0]!.boost!.required).toBe(true);
  const before = queue.list(); reconcileWorkerPopulation(state,plan,[],2); expect(queue.list()).toEqual(before);
});
