import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const require = createRequire(new URL('./package.json',import.meta.url)),position = { room: 'W0N1',x: 10,y: 10 };
function processors(run) {
  const utils = require('@screeps/engine/src/utils'),constants = require('@screeps/common/lib/constants'),original = utils.getDriver;
  utils.getDriver = () => ({ constants });
  try { return run({ decay: require('@screeps/engine/src/processor/intents/containers/tick'),ground: require('@screeps/engine/src/processor/intents/energy/tick'),
    repair: require('@screeps/engine/src/processor/intents/creeps/repair'),transfer: require('@screeps/engine/src/processor/intents/creeps/transfer'),
    harvest: require('@screeps/engine/src/processor/intents/creeps/harvest'),source: require('@screeps/engine/src/processor/intents/sources/tick') }); }
  finally { utils.getDriver = original; }
}
function fixture({ hits = 5000,energy = 42,ground = 0,owned = false,harvest = false } = {}) {
  const store = (id,energy,size) => ({ id,energy,capacity: size,usedCapacity: energy,freeEnergyCapacity: size-energy });
  const container = { _id: 'container',type: 'container',room: 'W0N1',x: 10,y: 10,hits,hitsMax: 250000,store: { energy },storeCapacity: 2000,nextDecayTime: 101 };
  const unit = { _id: 'unit',type: 'creep',user: 'self',room: 'W0N1',x: 10,y: 10,body: Array.from({ length: harvest ? 4 : 1 },() => ({ type: 'work',hits: 100 })),store: { energy: harvest ? 48 : 5 },storeCapacity: 50,actionLog: {} };
  const objects = { container,unit },source = { _id: 'source',type: 'source',room: 'W0N1',x: 10,y: 9,energy: 100,energyCapacity: 3000 };
  if (harvest) objects.source = source;
  if (ground) objects.pile = { _id: 'pile',type: 'energy',room: 'W0N1',x: 10,y: 10,resourceType: 'energy',energy: ground };
  let inserted = 0;
  const scope = { roomObjects: objects,gameTime: 100,roomController: owned ? { user: 'self',level: 6 } : harvest ? { reservation: { user: 'self' } } : null,
    eventLog: [],stats: { inc() {} },bulk: { insert: () => 'new-'+(++inserted),remove() {},update(object,patch) { if (patch.store) patch = { ...patch,store: { ...object.store,...patch.store } }; Object.assign(object,patch); } } };
  const ecology = { sources: harvest ? [{ id: 'source',position: { ...position,y: 9 },energy: 100,capacity: 3000,regenerationIn: null,regenerationTicks: 300 }] : [],
    ground: ground ? [{ position,energy: ground }] : [],containers: [{ id: 'container',position,decay: { remaining: 1,interval: owned ? 499 : 99,amount: 5000 } }],
    structures: [{ id: 'container',position,hits,hitsMax: 250000,repairable: true }],decayDivisor: 1000 };
  return { model: createEnergyInventoryFrame(100,[store('container',energy,2000),store('unit',unit.store.energy,50)],[],ecology),scope,objects,unit,container,source };
}
function order(operations,groundFirst = false) {
  return [...operations].sort((a,b) => (a.kind === 'ground' ? (groundFirst ? -1 : 1) : 0)-(b.kind === 'ground' ? (groundFirst ? -1 : 1) : 0)).map(operation => operation.key);
}
function nativeTick(f,p,groundFirst = false) {
  const keys = Object.keys(f.objects).filter(id => ['source','container','energy'].includes(f.objects[id].type));
  keys.sort((a,b) => (f.objects[a].type === 'energy' ? (groundFirst ? -1 : 1) : 0)-(f.objects[b].type === 'energy' ? (groundFirst ? -1 : 1) : 0));
  for (const id of keys) { const object = f.objects[id]; if (object.type === 'container') p.decay(object,f.scope); else if (object.type === 'energy') p.ground(object,f.scope); else p.source(object,f.scope); }
}
function compare(f) {
  const stores = f.model.snapshot(),ecology = f.model.ecologySnapshot(),live = f.objects.container;
  expect(stores.find(store => store.id === 'container')?.energy).toBe(live?.store.energy); expect(stores.find(store => store.id === 'unit').energy).toBe(f.unit.store.energy);
  expect(ecology.structures[0].hits).toBe(live?.hits ?? 0);
  expect(ecology.ground.reduce((sum,drop) => sum+drop.energy,0)).toBe(Object.values(f.objects).filter(object => object.type === 'energy').reduce((sum,drop) => sum+drop.energy,0));
  if (live) expect(ecology.containers[0].decay.remaining).toBe(live.nextDecayTime-f.scope.gameTime-1);
}

test.each([false,true])('container countdown/recurrence matches pinned processor for owned=%s',owned => processors(p => {
  const f = fixture({ hits: 250000,energy: 0,owned }),interval = owned ? 499 : 99;
  for (let tick = 100; tick <= 100+interval; tick++) { f.scope.gameTime = tick; f.model.begin(tick); nativeTick(f,p); f.model.finish([],order); compare(f); }
  expect(f.container.hits).toBe(240000);
}));

test.each([false,true])('existing pile and container death use declared object order groundFirst=%s',groundFirst => processors(p => {
  const f = fixture({ ground: 1000 }); f.model.begin(100); nativeTick(f,p,groundFirst); f.model.finish([],operations => order(operations,groundFirst)); compare(f);
  expect(f.model.ecologySnapshot().ground[0].energy).toBe(groundFirst ? 1041 : 1040);
}));

test('new spill is not in the existing object iteration, then decays on the next frame and survives JSON resume',() => processors(p => {
  const f = fixture(); f.model.begin(100); nativeTick(f,p); f.model.finish([],order); compare(f); expect(f.model.ecologySnapshot().ground[0].energy).toBe(42);
  const checkpoint = JSON.parse(JSON.stringify(f.model.checkpoint())),resumed = createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects,checkpoint.ecology);
  f.scope.gameTime = 101; nativeTick(f,p); resumed.begin(101); resumed.finish([],order); f.model = resumed; compare(f); expect(resumed.ecologySnapshot().ground[0].energy).toBe(41);
}));

test.each(['repair','transfer','harvest'])('actual %s effects remain valid evidence after same-frame container decay',action => processors(p => {
  const f = fixture({ hits: action === 'repair' ? 4999 : 5000,harvest: action === 'harvest' }); f.model.begin(100);
  if (action === 'repair') { f.model.queue({ id: action,kind: action,source: 'unit',target: 'container',position,profile: { workParts: 1,boostBonuses: [] } }); p.repair(f.unit,{ id: 'container' },f.scope); }
  else if (action === 'transfer') { f.model.queue({ id: action,kind: action,source: 'unit',target: 'container',amount: 5 }); p.transfer(f.unit,{ id: 'container',resourceType: 'energy',amount: 5 },f.scope); }
  else { f.model.queue({ id: action,kind: action,source: 'source',target: 'unit',amount: 8,position,container: 'container' }); p.harvest(f.unit,{ id: 'source' },f.scope); }
  nativeTick(f,p); f.model.finish([action],order); compare(f);
  const cp = JSON.parse(JSON.stringify(f.model.checkpoint())),resumed = createEnergyInventoryFrame(cp.nextTick,cp.stores,cp.effects,cp.ecology); resumed.begin(101); expect(resumed.effect(action)?.kind).toBe(action);
}));
