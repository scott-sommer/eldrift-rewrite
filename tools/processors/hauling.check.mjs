import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { createEnergyInventoryFrame } from '../../src/capabilities/resources/energy-inventory/frame';
const require = createRequire(new URL('./package.json',import.meta.url));
function withProcessors(run) {
  const utils = require('@screeps/engine/src/utils'),constants = require('@screeps/common/lib/constants'),original = utils.getDriver;
  utils.getDriver = () => ({ constants });
  try { return run({ withdraw: require('@screeps/engine/src/processor/intents/creeps/withdraw'),transfer: require('@screeps/engine/src/processor/intents/creeps/transfer'),utils }); }
  finally { utils.getDriver = original; }
}
function fixture(input) {
  const roomObjects = Object.fromEntries(input.map(([id,energy,capacity,other = 0]) => [id,{ _id: id,type: id === 'source' || id === 'bank' ? 'container' : 'creep',user: 'self',x: 10,y: 10,store: { energy,H: other },storeCapacity: capacity }]));
  const scope = { roomObjects,eventLog: [],roomController: null,gameTime: 10,bulk: { update(object,patch) {
    for (const [key,value] of Object.entries(patch)) { if (key === 'store') Object.assign(object.store,value); else object[key] = value; }
  } } };
  const model = createEnergyInventoryFrame(10,input.map(([id,energy,capacity,other = 0]) => ({ id,energy,capacity,usedCapacity: energy+other,freeEnergyCapacity: capacity-energy-other })));
  model.begin(10); return { roomObjects,scope,model };
}
function compare(f,intents,order,processors) {
  for (const intent of intents) f.model.queue(intent);
  for (const id of order) {
    const intent = intents.find(item => item.id === id),withdraw = intent.kind === 'withdraw';
    const actor = f.roomObjects[withdraw ? intent.target : intent.source],target = withdraw ? intent.source : intent.target;
    processors[intent.kind](actor,{ id: target,resourceType: 'energy',amount: intent.amount },f.scope);
  }
  const effects = f.model.finish(order);
  for (const store of f.model.snapshot()) {
    const native = f.roomObjects[store.id],used = processors.utils.calcResources(native);
    expect(store).toEqual({ id: store.id,energy: native.store.energy,capacity: native.storeCapacity,usedCapacity: used,freeEnergyCapacity: native.storeCapacity-used });
  }
  expect(effects.map(effect => effect.amount)).toEqual(order.map(id => {
    const intent = intents.find(item => item.id === id);
    return f.scope.eventLog.find(event => event.objectId === intent.source && event.data.targetId === intent.target)?.data.amount ?? 0;
  }));
}
test.each([['a','b','deposit'],['a','deposit','b']])('shared withdrawals and miner deposit match explicit pinned processor order %j',(...order) => withProcessors(processors => {
  const f = fixture([['source',50,100],['a',0,50],['b',0,50],['miner',50,50]]);
  compare(f,[{ id: 'a',kind: 'withdraw',source: 'source',target: 'a',amount: 50 },{ id: 'b',kind: 'withdraw',source: 'source',target: 'b',amount: 50 },
    { id: 'deposit',kind: 'transfer',source: 'miner',target: 'source',amount: 50 }],order,processors);
}));
test.each([[50,70],[60,0]])('mixed capacity clipping and insufficient sender stock match pinned transfer: %i/%i',(amount,other) => withProcessors(processors => {
  const f = fixture([['bank',0,100,other],['courier',50,100]]);
  compare(f,[{ id: 'delivery',kind: 'transfer',source: 'courier',target: 'bank',amount }],['delivery'],processors);
}));
