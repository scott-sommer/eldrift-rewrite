import { expect, test } from 'vitest';
import { builderBody } from '../../src/capabilities/spawning/worker-recipes';
import { createWorkerBoostPolicy } from '../../src/features/industry/boosts/worker-policy';
import { reconcileWorkerPopulation } from '../../src/features/work/population';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const config = { workerBuilderRecipe: 'boosted' as const,workerBoostPolicy: 'required' as const,workerBoostTimeout: 200 }, price = { mineral: 30,energy: 20 };
const kit = { minerals: { XZHO2: 300,XKH2O: 600,XLH2O: 600 },energy: 1000 };
const body = builderBody(3500,true)!.parts;
function fixture() {
  let memory = {}; const port = createMemoryPort(() => memory), queue = createSpawnQueue(port,'W0N1');
  const plan = { room: 'W0N1',level: 8,enabled: true,budget: 3500,builderRecipe: 'boosted' as const,fallback: 'builder' as const,
    targets: { builder: 2,fortifier: 0,upgrader: 0 },selectBirthBoost: createWorkerBoostPolicy(config,kit,price) };
  return { port,queue,plan,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('legacy large recipe requests exact top-tier movement/carry/build effects and one kit funds one body',() => {
  const choose = createWorkerBoostPolicy(config,kit,price);
  expect(body).toHaveLength(50); expect(choose('builder',body)).toEqual({ required: true,timeout: 200,steps: [
    { part: 'move',resource: 'XZHO2',count: 10 },{ part: 'carry',resource: 'XKH2O',count: 20 },{ part: 'work',resource: 'XLH2O',count: 20 }] });
  expect(choose('builder',body)).toBe('wait'); expect(kit.energy).toBe(1000);
});
test('lower tiers and partially funded top tiers cannot admit the optimized body',() => {
  const lower = { minerals: { ZHO2: 300,KH2O: 600,LH2O: 600 },energy: 1000 };
  expect(createWorkerBoostPolicy(config,lower,price)('builder',body)).toBe('wait');
  expect(createWorkerBoostPolicy(config,{ ...kit,energy: 999 },price)('builder',body)).toBe('wait');
  expect(createWorkerBoostPolicy(config,{ ...kit,resources: ['XZHO2','XLH2O'] },price)('builder',body)).toBe('wait');
});
test('matching lab-local kits fund each effect without borrowing energy trapped in another lab',() => {
  const local = { XZHO2: { mineral: 300,energy: 200 },XKH2O: { mineral: 600,energy: 400 },XLH2O: { mineral: 600,energy: 400 } };
  expect(createWorkerBoostPolicy(config,{ minerals: {},energy: 0,local },price)('builder',body)).toMatchObject({ required: true });
  expect(createWorkerBoostPolicy(config,{ minerals: {},energy: 0,local: { ...local,XLH2O: { mineral: 600,energy: 399 } } },price)('builder',body)).toBe('wait');
});
test('ordinary recruitment queues the50part/150tick contract once and preserves its identity through reset',() => {
  const f = fixture(); reconcileWorkerPopulation(f.port,f.plan,[],1); const first = f.queue.list();
  expect(first).toHaveLength(1); expect(first[0]!.body).toEqual(body); expect(first[0]!.boost!.required).toBe(true); f.reset();
  reconcileWorkerPopulation(f.port,{ ...f.plan,selectBirthBoost: createWorkerBoostPolicy(config,{ minerals: {},energy: 0 },price) },[],2);
  expect(f.queue.list()).toEqual(first);
});
test('insufficient energy budget or absent boost selector never creates an unboosted large builder',() => {
  const f = fixture(); reconcileWorkerPopulation(f.port,{ ...f.plan,budget: 3499 },[],1); expect(f.queue.list()).toEqual([]);
  const { selectBirthBoost: _selector,...unfunded } = f.plan; void _selector;
  reconcileWorkerPopulation(f.port,unfunded,[],2); expect(f.queue.list()).toEqual([]);
  expect(() => reconcileWorkerPopulation(f.port,{ ...f.plan,selectBirthBoost: () => ({ steps: [{ part: 'work',resource: 'XLH2O',count: 20 }],required: false,timeout: 100 }) },[],3)).toThrow('required contract');
});
