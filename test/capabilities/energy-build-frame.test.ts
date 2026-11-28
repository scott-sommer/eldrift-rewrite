import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
import { constructionEcology,constructionSite } from '../fixtures/construction-site';
const profile = { workParts: 1,boostBonuses: [] },position = { room: 'W0N1',x: 10,y: 10 };
const store = (id: string,energy = 10,capacity = 50) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy });
const build = (id: string,source = id,allowed = true) => ({ id,source,kind: 'build' as const,target: 'site',position,profile,allowed });
const postprocess = (operations: readonly { key: string }[]) => operations.map(operation => operation.key);

test('only the winning builder spends energy and creates a zero-stock container, with first-frame decay',() => {
  const world = createEnergyInventoryFrame(10,[store('a'),store('b')],[],constructionEcology()); world.begin(10);
  world.queue(build('a')); world.queue(build('b'));
  expect(world.site('site')!.progress).toBe(4995); expect(world.observe('forecast:site:container')).toBeUndefined();
  expect(world.finish(['b','a'],postprocess)).toMatchObject([{ id: 'b',amount: 5,progressAdded: 5,completed: true,created: 'forecast:site:container' },{ id: 'a',amount: 0,progressAdded: 0,completed: false }]);
  expect(world.snapshot().map(store => store.energy)).toEqual([10,5,0]);
  expect(world.ecologySnapshot().containers[0]!.decay!.remaining).toBe(99);
  const checkpoint = JSON.parse(JSON.stringify(world.checkpoint()));
  const resumed = createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects,checkpoint.ecology); resumed.begin(11);
  expect(resumed.site('site')).toBeUndefined(); expect(resumed.structure('forecast:site:container')!.hits).toBe(250000);
  expect(resumed.effect('b')).toMatchObject({ amount: 5,completed: true });
});

test.each([['build','harvest'],['harvest','build']])('newborn overflow capture obeys actor processing order %j',(first,second) => {
  const ecology = constructionEcology(); ecology.sources.push({ id: 'source',position: { ...position,y: 11 },energy: 10,capacity: 1500,regenerationIn: null,regenerationTicks: 300 });
  const world = createEnergyInventoryFrame(10,[store('builder'),store('miner',50)],[],ecology); world.begin(10);
  world.queue(build('build','builder')); world.queue({ id: 'harvest',kind: 'harvest',source: 'source',target: 'miner',amount: 2,position });
  world.finish([first,second],postprocess);
  expect(world.snapshot().find(store => store.id === 'forecast:site:container')!.energy).toBe(first === 'build' ? 2 : 0);
  expect(world.ecologySnapshot().ground.map(drop => drop.energy)).toEqual(first === 'build' ? [] : [1]);
});

test('current build permission suppresses effects and failed object ordering leaves no partial birth',() => {
  const world = createEnergyInventoryFrame(10,[store('a')],[],constructionEcology()); world.begin(10); world.queue(build('a','a',false)); world.finish(['a']);
  expect(world.snapshot()[0]!.energy).toBe(10); expect(world.ecologySnapshot().sites![0]!.progress).toBe(4995);
  world.begin(11); world.queue(build('b','a'));
  expect(() => world.finish(['b'])).toThrow('object-processing order'); expect(world.site('site')!.progress).toBe(4995);
  world.finish(['b'],postprocess); expect(world.snapshot()).toHaveLength(2);
});

test('construction rejects invented stock, missing completion recipes and corrupt birth witnesses',() => {
  const ecology = constructionEcology(); ecology.sites![0]!.completion!.store.energy = 1;
  expect(() => createEnergyInventoryFrame(10,[store('a')],[],ecology)).toThrow();
  const unqualified = constructionEcology({ ...constructionSite(),completion: null });
  const refused = createEnergyInventoryFrame(10,[store('a')],[],unqualified); refused.begin(10);
  expect(() => refused.queue(build('a'))).toThrow('qualification');
  const world = createEnergyInventoryFrame(10,[store('a')],[],constructionEcology()); world.begin(10); world.queue(build('a')); world.finish(['a'],postprocess);
  const checkpoint = world.checkpoint(),effect = checkpoint.effects[0]!; if (effect.kind !== 'build') throw new Error('Expected build effect'); effect.created = 'other';
  expect(() => createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects,checkpoint.ecology)).toThrow('witness');
});

test('part-built sites retain progress without births, while completed then destroyed containers retain valid evidence',() => {
  const ecology = constructionEcology(constructionSite(position,10));
  const world = createEnergyInventoryFrame(10,[store('a')],[],ecology); world.begin(10); world.queue(build('a')); world.finish(['a']);
  const cp = world.checkpoint(),resumed = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); resumed.begin(11);
  expect(resumed.site('site')!.progress).toBe(4995); resumed.queue(build('b','a')); resumed.finish(['b'],postprocess);
  const fragile = constructionEcology(),recipe = fragile.sites![0]!.completion!;
  recipe.health.hits = 5000; recipe.health.hitsMax = 5000; recipe.container.decay!.remaining = 1;
  const doomed = createEnergyInventoryFrame(10,[store('a')],[],fragile); doomed.begin(10); doomed.queue(build('a')); doomed.finish(['a'],postprocess);
  const dead = doomed.checkpoint(); expect(dead.stores).toHaveLength(1); expect(dead.ecology!.containers[0]!.destroyedAt).toBe(11);
  const deadResume = createEnergyInventoryFrame(dead.nextTick,dead.stores,dead.effects,dead.ecology); deadResume.begin(11);
  expect(deadResume.structure('forecast:site:container')).toBeUndefined(); expect(deadResume.effect('a')).toMatchObject({ completed: true });
});
