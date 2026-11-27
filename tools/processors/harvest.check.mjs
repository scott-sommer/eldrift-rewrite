import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const require = createRequire(new URL('./package.json',import.meta.url));
const position = { room: 'W0N1',x: 10,y: 10 };
function processors(run) {
  const utils = require('@screeps/engine/src/utils'),constants = require('@screeps/common/lib/constants'),original = utils.getDriver;
  utils.getDriver = () => ({ constants });
  try { return run({ constants,harvest: require('@screeps/engine/src/processor/intents/creeps/harvest'),withdraw: require('@screeps/engine/src/processor/intents/creeps/withdraw'),
    sourceTick: require('@screeps/engine/src/processor/intents/sources/tick'),dropTick: require('@screeps/engine/src/processor/intents/energy/tick') }); }
  finally { utils.getDriver = original; }
}
function fixture({ cargo = 48,capacity = 50,containerEnergy = 1980,other = 0,bodyOther = 0,sourceEnergy = 100 } = {}) {
  const store = (id,energy,size,used = energy) => ({ id,energy,capacity: size,usedCapacity: used,freeEnergyCapacity: size-used });
  const ecology = { sources: [{ id: 'source',position: { ...position,y: 9 },energy: sourceEnergy,capacity: 3000,regenerationIn: null,regenerationTicks: 300 }],ground: [],containers: [{ id: 'container',position }],decayDivisor: 1000 };
  const model = createEnergyInventoryFrame(10,[store('miner',cargo,capacity,cargo+bodyOther),store('container',containerEnergy,2000,containerEnergy+other),store('courier',0,50)],[],ecology);
  const miner = { _id: 'miner',type: 'creep',user: 'self',room: position.room,x: 10,y: 10,body: Array.from({ length: 4 },() => ({ type: 'work',hits: 100 })),store: { energy: cargo,U: bodyOther },storeCapacity: capacity,actionLog: {} };
  const container = { _id: 'container',type: 'container',room: position.room,x: 10,y: 10,hits: 100,store: { energy: containerEnergy,U: other },storeCapacity: 2000 };
  const source = { _id: 'source',type: 'source',room: position.room,x: 10,y: 9,energy: sourceEnergy,energyCapacity: 3000 };
  const courier = { _id: 'courier',type: 'creep',user: 'self',room: position.room,x: 11,y: 10,store: { energy: 0 },storeCapacity: 50 };
  const objects = { miner,container,source,courier }; let nextId = 0;
  const scope = { roomObjects: objects,gameTime: 10,roomController: { reservation: { user: 'self' } },stats: { inc() {} },eventLog: [],
    bulk: { update(object,patch) { if (patch.store) patch = { ...patch,store: { ...object.store,...patch.store } }; Object.assign(object,patch); },
      insert(object) { return 'drop-'+(++nextId); },remove(id) { delete objects[id]; } } };
  return { model,miner,container,source,courier,objects,scope };
}
function compare(f) {
  const physical = f.model.snapshot();
  expect(physical.map(store => store.energy)).toEqual([f.miner.store.energy,f.container.store.energy,f.courier.store.energy]);
  const ecology = f.model.ecologySnapshot();
  expect(ecology.sources[0].energy).toBe(f.source.energy);
  expect(ecology.sources[0].regenerationIn).toBe(f.source.nextRegenerationTime == null ? null : f.source.nextRegenerationTime-f.scope.gameTime-1);
  expect(ecology.ground.reduce((sum,drop) => sum+drop.energy,0)).toBe(Object.values(f.objects).filter(object => object.type === 'energy').reduce((sum,drop) => sum+drop.energy,0));
}

test.each([{},{ cargo: 0,capacity: 0 },{ containerEnergy: 2000 },{ containerEnergy: 1990,other: 8 },{ sourceEnergy: 3 },{ bodyOther: 2 }])('harvest, standing-container capture and same-frame drop decay match pinned processors: %j',options => processors(p => {
  const f = fixture(options); expect(p.constants.ENERGY_DECAY).toBe(1000); expect(p.constants.ENERGY_REGEN_TIME).toBe(300);
  f.model.begin(10); f.model.queue({ id: 'harvest',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position,container: 'container' });
  p.harvest(f.miner,{ id: 'source' },f.scope); p.sourceTick(f.source,f.scope);
  for (const object of Object.values(f.objects)) if (object.type === 'energy') p.dropTick(object,f.scope);
  const effects = f.model.finish(['harvest']); compare(f);
  expect(effects[0].amount).toBe(f.scope.eventLog[0]?.data.amount ?? 0);
}));

test.each([{ order: ['harvest','withdraw'] },{ order: ['withdraw','harvest'] }])('competing container overflow and withdrawal follow the declared processor order %j',({ order }) => processors(p => {
  const f = fixture({ containerEnergy: 1998 }); f.model.begin(10);
  f.model.queue({ id: 'harvest',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position,container: 'container' });
  f.model.queue({ id: 'withdraw',kind: 'withdraw',source: 'container',target: 'courier',amount: 50 });
  for (const action of order) {
    if (action === 'harvest') p.harvest(f.miner,{ id: 'source' },f.scope);
    else p.withdraw(f.courier,{ id: 'container',resourceType: 'energy',amount: 50 },f.scope);
  }
  p.sourceTick(f.source,f.scope); for (const object of Object.values(f.objects)) if (object.type === 'energy') p.dropTick(object,f.scope);
  f.model.finish(order); compare(f);
}));

test('source regeneration after extraction matches300 pinned action frames',() => processors(p => {
  const f = fixture({ sourceEnergy: 3 });
  for (let tick = 10; tick < 310; tick++) {
    f.scope.gameTime = tick; f.model.begin(tick);
    if (tick === 10) { f.model.queue({ id: 'harvest',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position,container: 'container' }); p.harvest(f.miner,{ id: 'source' },f.scope); }
    p.sourceTick(f.source,f.scope); f.model.finish(tick === 10 ? ['harvest'] : []); compare(f);
  }
  expect(f.source.energy).toBe(3000);
}));


test('successive overflow merges with existing ground energy before the pinned decay phase',() => processors(p => {
  const f = fixture({ cargo: 0,capacity: 0,containerEnergy: 2000 });
  for (let tick = 10; tick < 13; tick++) {
    f.scope.gameTime = tick; f.model.begin(tick); const id = 'harvest-'+tick;
    f.model.queue({ id,kind: 'harvest',source: 'source',target: 'miner',amount: 8,position,container: 'container' });
    p.harvest(f.miner,{ id: 'source' },f.scope); p.sourceTick(f.source,f.scope);
    for (const object of Object.values(f.objects)) if (object.type === 'energy') p.dropTick(object,f.scope);
    f.model.finish([id]); compare(f);
  }
  expect(f.model.ecologySnapshot().ground).toEqual([{ position,energy: 21 }]);
}));


test('standing-container capture is automatic even without a requested handoff target',() => processors(p => {
  const f = fixture(); f.model.begin(10);
  f.model.queue({ id: 'harvest',kind: 'harvest',source: 'source',target: 'miner',amount: 8,position });
  p.harvest(f.miner,{ id: 'source' },f.scope); p.sourceTick(f.source,f.scope); f.model.finish(['harvest']); compare(f);
  expect(f.container.store.energy).toBe(1986);
}));
