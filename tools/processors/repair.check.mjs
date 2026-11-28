import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { nativeRepairProfile } from '../../src/adapters/screeps/repair-profile';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const require = createRequire(new URL('./package.json',import.meta.url));
const position = { room: 'W0N1',x: 10,y: 10 };
function processors(run) {
  const utils = require('@screeps/engine/src/utils'),constants = require('@screeps/common/lib/constants'),original = utils.getDriver,boosts = globalThis.BOOSTS;
  utils.getDriver = () => ({ constants }); globalThis.BOOSTS = constants.BOOSTS;
  try { return run({ repair: require('@screeps/engine/src/processor/intents/creeps/repair'),transfer: require('@screeps/engine/src/processor/intents/creeps/transfer') }); }
  finally { utils.getDriver = original; if (boosts === undefined) delete globalThis.BOOSTS; else globalThis.BOOSTS = boosts; }
}
function fixture({ body = [{ type: 'work',hits: 100 }],energy = 5,hits = 249950,other = 0,type = 'container' } = {}) {
  const store = (id,energy,capacity,used = energy) => ({ id,energy,capacity,usedCapacity: used,freeEnergyCapacity: capacity-used });
  const profile = nativeRepairProfile(body),target = { id: 'target',position,hits,hitsMax: 250000,repairable: type === 'container' };
  const model = createEnergyInventoryFrame(100,[store('miner',energy,50,energy+other),store('donor',10,50)],[],{ sources: [],ground: [],containers: [],structures: [target],decayDivisor: 1000 });
  const miner = { _id: 'miner',type: 'creep',user: 'self',room: 'W0N1',x: 10,y: 10,body,store: { energy,U: other },storeCapacity: 50,actionLog: {} };
  const donor = { _id: 'donor',type: 'creep',user: 'self',room: 'W0N1',x: 11,y: 10,store: { energy: 10 },storeCapacity: 50 };
  const structure = { _id: 'target',type,x: 10,y: 10,room: 'W0N1',hits,hitsMax: 250000 };
  const scope = { roomObjects: { miner,donor,target: structure },stats: { inc() {} },eventLog: [],bulk: { update(object,patch) { if (patch.store) patch = { ...patch,store: { ...object.store,...patch.store } }; Object.assign(object,patch); } } };
  return { model,profile,miner,donor,structure,scope };
}
function compare(f) {
  const stores = f.model.snapshot(),target = f.model.ecologySnapshot().structures[0];
  expect(stores.map(store => store.energy)).toEqual([f.miner.store.energy,f.donor.store.energy]); expect(target.hits).toBe(f.structure.hits);
}

test.each([
  {},{ hits: 249999 },{ energy: 1,hits: 249000,body: [{ type: 'work',hits: 100,boost: 'XLH2O' },{ type: 'work',hits: 0,boost: 'XLH2O' }] },
  { energy: 1,hits: 249000,body: Array.from({ length: 4 },() => ({ type: 'work',hits: 100,boost: 'LH' })) },
  { other: 40 },{ hits: 250000 },{ body: [{ type: 'work',hits: 0,boost: 'XLH2O' }] },{ type: 'powerBank' },
])('physical repair energy charge and boosted hits match the pinned processor: %j',options => processors(p => {
  const f = fixture(options); f.model.begin(100);
  f.model.queue({ id: 'repair',kind: 'repair',source: 'miner',target: 'target',position,profile: f.profile }); p.repair(f.miner,{ id: 'target' },f.scope);
  const effect = f.model.finish(['repair'])[0]; compare(f);
  expect(effect.repairedHits).toBe(f.scope.eventLog[0]?.data.amount ?? 0); expect(effect.amount).toBe(f.scope.eventLog[0]?.data.energySpent ?? 0);
}));

test.each([{ order: ['transfer','repair'] },{ order: ['repair','transfer'] }])('repair uses actual processor-time energy after competing donation in order %j',({ order }) => processors(p => {
  const f = fixture({ energy: 1,hits: 249000,body: Array.from({ length: 4 },() => ({ type: 'work',hits: 100 })) }); f.model.begin(100);
  f.model.queue({ id: 'repair',kind: 'repair',source: 'miner',target: 'target',position,profile: f.profile }); f.model.queue({ id: 'transfer',kind: 'transfer',source: 'donor',target: 'miner',amount: 10 });
  for (const action of order) { if (action === 'repair') p.repair(f.miner,{ id: 'target' },f.scope); else p.transfer(f.donor,{ id: 'miner',resourceType: 'energy',amount: 10 },f.scope); }
  f.model.finish(order); compare(f);
}));
