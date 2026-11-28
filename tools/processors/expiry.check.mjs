import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { nativeExpiryProfile } from '../../src/adapters/screeps/expiry-profile';
import { corpseSalvage } from '../../src/capabilities/resources/body-remains';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
import { expiryEcology,expiryOrder,expiryPoses,expiryStore,expiryPosition } from '../../test/fixtures/energy-expiry';
const require = createRequire(new URL('./package.json',import.meta.url));
function processors(run) {
  const utils = require('@screeps/engine/src/utils'),C = require('@screeps/common/lib/constants'),driver = utils.getDriver;
  utils.getDriver = () => ({ constants: C });
  const keys = ['BODYPART_COST','CREEP_CORPSE_RATE','CREEP_LIFE_TIME','CREEP_CLAIM_LIFE_TIME','CREEP_PART_MAX_ENERGY','LAB_BOOST_ENERGY','LAB_BOOST_MINERAL','TOMBSTONE_DECAY_PER_PART'];
  const globals = keys.map(key => [key,globalThis[key]]); for (const key of keys) globalThis[key] = C[key];
  const movement = require('@screeps/engine/src/processor/intents/movement'),execute = movement.execute; movement.execute = () => {};
  try { return run({ C,creep: require('@screeps/engine/src/processor/intents/creeps/tick'),die: require('@screeps/engine/src/processor/intents/creeps/_die'),tombstone: require('@screeps/engine/src/processor/intents/tombstones/tick'),
    container: require('@screeps/engine/src/processor/intents/containers/tick'),energy: require('@screeps/engine/src/processor/intents/energy/tick'),withdraw: require('@screeps/engine/src/processor/intents/creeps/withdraw') }); }
  finally { movement.execute = execute; utils.getDriver = driver; for (const [key,value] of globals) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
}
function fixture(p,{ container = false,dying = false,free = 2000,claim = false,empty = false } = {}) {
  const body = (claim ? Array(50).fill('claim') : ['work','carry','move']).map(type => ({ type,hits: 100 })),energy = empty || claim ? 0 : 20,capacity = claim ? 0 : 50;
  const unit = { _id: 'unit',name: 'unit',type: 'creep',user: 'self',room: 'W0N1',x: 10,y: 10,body,ageTime: 101,_ticksToLive: 1,store: { energy },storeCapacity: capacity,hits: body.length*100,hitsMax: body.length*100,fatigue: 0,actionLog: {},_actionLog: {} };
  const rescuer = { _id: 'rescuer',type: 'creep',user: 'self',room: 'W0N1',x: 11,y: 10,store: { energy: 0 },storeCapacity: 50 };
  const objects = { unit,rescuer },inserted = []; let serial = 0;
  const scope = { roomObjects: objects,roomController: null,gameTime: 100,eventLog: [],stats: { inc() {} },bulk: { remove() {},insert(object) { const id = 'new-'+(++serial); object._id = id; if (object.type === 'tombstone') inserted.push(object); return id; },update(object,patch) { if (patch.store) patch = { ...patch,store: { ...object.store,...patch.store } }; Object.assign(object,patch); } } };
  const ecology = expiryEcology(),profile = nativeExpiryProfile(body),stores = [expiryStore('unit',energy,capacity),expiryStore('rescuer',0)]; Object.assign(ecology.bodies[0],profile);
  if (container) {
    const bank = { _id: 'container',type: 'container',room: 'W0N1',x: 10,y: 10,hits: dying ? 5000 : 250000,hitsMax: 250000,store: { energy: 2000-free },storeCapacity: 2000,nextDecayTime: dying ? 101 : 1000 }; objects.container = bank;
    stores.push(expiryStore('container',bank.store.energy,2000)); ecology.containers.push({ id: 'container',position: expiryPosition,decay: { remaining: dying ? 1 : 900,interval: 99,amount: 5000 } }); ecology.structures = [{ id: 'container',position: expiryPosition,hits: bank.hits,hitsMax: bank.hitsMax,repairable: true }];
  }
  return { model: createEnergyInventoryFrame(100,stores,[],ecology),objects,scope,inserted,unit,rescuer,profile };
}
function compare(f) {
  const ecology = f.model.ecologySnapshot(),stores = f.model.snapshot(),tomb = Object.values(f.objects).find(object => object.type === 'tombstone');
  expect(stores.some(store => store.id === 'unit')).toBe(!!f.objects.unit);
  expect(stores.find(store => store.id === 'rescuer').energy).toBe(f.rescuer.store.energy);
  expect(stores.find(store => store.id === 'container')?.energy).toBe(f.objects.container?.store.energy);
  expect(ecology.tombstones[0].energy).toBe(tomb?.store.energy ?? 0);
  if (tomb) expect(ecology.tombstones[0].remaining).toBe(Math.max(0,tomb.decayTime-f.scope.gameTime-1));
  expect(ecology.ground.reduce((sum,drop) => sum+drop.energy,0)).toBe(Object.values(f.objects).filter(object => object.type === 'energy').reduce((sum,drop) => sum+drop.energy,0));
}
test.each([{}, { empty: true },{ claim: true },{ container: true,free: 10 },{ container: true,dying: true },{ container: true,dying: true,containerFirst: true }])('natural expiry, salvage and tombstone withdrawal/release match pinned object order %j',options => processors(p => {
  const f = fixture(p,options),until = 100+f.profile.tombstoneDecay;
  for (let tick = 100; tick <= until; tick++) {
    f.scope.gameTime = tick; f.model.begin(tick); const ids = [];
    const tomb = Object.values(f.objects).find(object => object.type === 'tombstone');
    if (tick === 101 && tomb?.store.energy) {
      f.model.queue({ id: 'withdraw',kind: 'withdraw',source: 'forecast:tomb',target: 'rescuer',amount: 7 }); p.withdraw(f.rescuer,{ id: tomb._id,resourceType: 'energy',amount: 7 },f.scope); ids.push('withdraw');
    }
    const keys = Object.keys(f.objects).filter(id => id !== 'rescuer').sort((a,b) => options.containerFirst ? (a === 'container' ? -1 : b === 'container' ? 1 : 0) : 0);
    for (const id of keys) { const object = f.objects[id]; if (object && p[object.type]) p[object.type](object,f.scope); }
    for (const object of f.inserted.splice(0)) f.objects[object._id] = object;
    f.model.finish(ids,operations => [...operations].sort((a,b) => options.containerFirst ? (a.kind === 'container' ? -1 : b.kind === 'container' ? 1 : 0) : 0).map(operation => operation.key),tick === 100 ? expiryPoses : undefined); compare(f);
    if (tick === 100) { const cp = JSON.parse(JSON.stringify(f.model.checkpoint())); f.model = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); }
  }
}));
test.each([{ types: Array(50).fill('claim'),ticks: 600,drop: 1 },{ types: Array(40).fill('work'),ticks: 901,drop: 0.2,boost: 'UO' },{ types: ['work','carry','move'],ticks: 1,drop: 0.2 }])('corpse material rounding and per-part cap match pinned death processor %j',options => processors(p => {
  const f = fixture(p),body = options.types.map(type => ({ type,hits: 0,...(options.boost ? { boost: options.boost } : {}) })); f.unit.body = body; f.unit._ticksToLive = options.ticks; f.unit.store.energy = 0;
  const expected = corpseSalvage(body.map(part => ({ cost: p.C.BODYPART_COST[part.type],...(part.boost ? { boost: part.boost } : {}) })),{ dropRate: options.drop,ticksToLive: options.ticks,lifetime: options.types.includes('claim') ? 600 : 1500,maximumPartEnergy: 125,boostEnergy: 20,boostMineral: 30 });
  p.die(f.unit,options.drop,false,f.scope); const actual = f.inserted[0].store;
  expect(Object.fromEntries(Object.entries(expected).filter(([,amount]) => amount > 0))).toEqual(actual);
}));
