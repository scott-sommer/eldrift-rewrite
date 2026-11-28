import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
import { constructionEcology,constructionSite } from '../../test/fixtures/construction-site';
const require = createRequire(new URL('./package.json',import.meta.url)),position = { room: 'W0N1',x: 10,y: 10 };
function processors(run) {
  const utils = require('@screeps/engine/src/utils'),constants = require('@screeps/common/lib/constants'),original = utils.getDriver;
  utils.getDriver = () => ({ constants });
  try { return run({ build: require('@screeps/engine/src/processor/intents/creeps/build'),harvest: require('@screeps/engine/src/processor/intents/creeps/harvest'),
    container: require('@screeps/engine/src/processor/intents/containers/tick'),energy: require('@screeps/engine/src/processor/intents/energy/tick'),source: require('@screeps/engine/src/processor/intents/sources/tick') }); }
  finally { utils.getDriver = original; }
}
function fixture(owned) {
  const creep = (id,energy) => ({ _id: id,type: 'creep',user: 'self',room: 'W0N1',x: 10,y: 10,body: [{ type: 'work',hits: 100 }],store: { energy },storeCapacity: 50,actionLog: {} });
  const builder = creep('builder',10),loser = creep('loser',10),miner = creep('miner',50),site = { _id: 'site',type: 'constructionSite',structureType: 'container',room: 'W0N1',x: 10,y: 10,progress: 4995,progressTotal: 5000 };
  const source = { _id: 'source',type: 'source',room: 'W0N1',x: 10,y: 11,energy: 100,energyCapacity: 3000 };
  const objects = { builder,loser,miner,site,source }; let inserted = 0;
  const scope = { roomObjects: objects,roomTerrain: '0'.repeat(2500),gameTime: 100,roomController: owned ? { user: 'self',level: 6 } : { reservation: { user: 'self' } },stats: { inc() {} },eventLog: [],
    bulk: { insert: () => 'inserted-'+(++inserted),remove() {},update(object,patch) { if (patch.store) patch = { ...patch,store: { ...object.store,...patch.store } }; Object.assign(object,patch); } } };
  const captured = constructionSite(); captured.completion.container.decay.interval = owned ? 499 : 99;
  const ecology = constructionEcology(captured); ecology.sources.push({ id: 'source',position: { ...position,y: 11 },energy: 100,capacity: 3000,regenerationIn: null,regenerationTicks: 300 });
  const stores = [builder,loser,miner].map(unit => ({ id: unit._id,energy: unit.store.energy,capacity: 50,usedCapacity: unit.store.energy,freeEnergyCapacity: 50-unit.store.energy }));
  return { model: createEnergyInventoryFrame(100,stores,[],ecology),objects,scope,builder,loser,miner };
}
function compare(f) {
  const container = Object.values(f.objects).find(object => object.type === 'container'),ecology = f.model.ecologySnapshot(),stores = f.model.snapshot();
  expect(stores.find(store => store.id === 'forecast:site:container').energy).toBe(container.store.energy);
  expect(stores.find(store => store.id === 'forecast:site:container').capacity).toBe(container.storeCapacity);
  expect(ecology.structures[0]).toMatchObject({ hits: container.hits,hitsMax: container.hitsMax });
  expect(ecology.containers[0].decay.remaining).toBe(container.nextDecayTime-f.scope.gameTime-1);
  expect(ecology.ground.reduce((sum,drop) => sum+drop.energy,0)).toBe(Object.values(f.objects).filter(object => object.type === 'energy').reduce((sum,drop) => sum+drop.energy,0));
  for (const unit of [f.builder,f.loser,f.miner]) expect(stores.find(store => store.id === unit._id).energy).toBe(unit.store.energy);
}
test.each([{ owned: false,buildFirst: false },{ owned: false,buildFirst: true },{ owned: true,buildFirst: false },{ owned: true,buildFirst: true }])('ordered construction births, overflow and first decay match native %j',({ owned,buildFirst }) => processors(p => {
  const f = fixture(owned),order = buildFirst ? ['build','loser','harvest'] : ['harvest','build','loser'];
  f.model.begin(100);
  for (const [id,source] of [['build','builder'],['loser','loser']]) f.model.queue({ id,kind: 'build',source,target: 'site',position,allowed: true,profile: { workParts: 1,boostBonuses: [] } });
  f.model.queue({ id: 'harvest',kind: 'harvest',source: 'source',target: 'miner',position,amount: 2 });
  for (const action of order) { if (action === 'harvest') p.harvest(f.miner,{ id: 'source' },f.scope); else p.build(action === 'build' ? f.builder : f.loser,{ id: 'site' },f.scope); }
  expect(f.objects.site).toBeUndefined();
  for (let tick = 100; tick <= 199; tick++) {
    f.scope.gameTime = tick;
    if (tick !== 100) f.model.begin(tick);
    for (const object of Object.values(f.objects)) if (p[object.type]) p[object.type](object,f.scope);
    f.model.finish(tick === 100 ? order : [],operations => operations.map(operation => operation.key)); compare(f);
    if (tick === 100) { const cp = JSON.parse(JSON.stringify(f.model.checkpoint())); f.model = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); }
  }
  expect(f.model.ecologySnapshot().structures[0].hits).toBe(245000);
}));
