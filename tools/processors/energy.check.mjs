import { orderedSpawnEnergy } from '../../src/adapters/screeps/spawn-energy';
import { createRequire } from 'node:module';
import { expect, test } from 'vitest';
import { createStartupEnergyLedger } from '../../src/capabilities/economy/startup/energy/ledger';
import { startupEnergyLayout } from '../../test/fixtures/startup-energy';
const require = createRequire(new URL('./package.json',import.meta.url));
function withProcessors(run) {
  const utils = require('@screeps/engine/src/utils'), constants = require('@screeps/common/lib/constants'), original = utils.getDriver;
  utils.getDriver = () => ({ constants });
  try { return run({ charge: require('@screeps/engine/src/processor/intents/spawns/_charge-energy'),transfer: require('@screeps/engine/src/processor/intents/creeps/transfer') }); }
  finally { utils.getDriver = original; }
}
function fixture() {
  const layout = startupEnergyLayout(), positions = { spawn: [10,10],second: [20,10],near: [11,10],far: [12,10] };
  const roomObjects = Object.fromEntries(layout.structures.map(point => [point.id,{ _id: point.id,type: point.kind,user: 'self',room: 'W0N1',x: positions[point.id][0],y: positions[point.id][1],store: { energy: point.energy },storeCapacityResource: { energy: point.capacity } }]));
  return { layout,roomObjects,scope: { roomObjects,eventLog: [],bulk: { update: (object,patch) => Object.assign(object,patch) } } };
}
function compare(model, roomObjects) { expect(model.result().points).toEqual(Object.values(roomObjects).filter(point => point.type !== 'creep').map(point => ({ id: point._id,energy: point.store.energy }))); }
test.each([50,350,450,600])('default ordered structure debit and atomic funding refusal match pinned spawn charging for cost %i',cost => withProcessors(({ charge }) => {
  const f = fixture(), model = createStartupEnergyLedger(f.layout);
  expect(model.charge('spawn',cost,0,'birth')).toBe(charge(f.roomObjects.spawn,cost,undefined,f.scope)); compare(model,f.roomObjects);
}));
test('declared alternate order matches the pinned explicit energyStructures branch',() => withProcessors(({ charge }) => {
  const f = fixture(), model = createStartupEnergyLedger(f.layout), order = f.layout.orders.find(order => order.spawn === 'second').structures;
  expect(model.charge('second',350,0,'birth')).toBe(charge(f.roomObjects.second,350,order,f.scope)); compare(model,f.roomObjects);
}));
test('a partial deposit into one actual spawn and later reuse match pinned transfer and charge effects',() => withProcessors(({ charge,transfer }) => {
  const f = fixture(), model = createStartupEnergyLedger(f.layout);
  charge(f.roomObjects.spawn,500,undefined,f.scope); model.charge('spawn',500,0,'initial');
  const creep = { _id: 'courier',type: 'creep',user: 'self',x: 11,y: 10,store: { energy: 400 } }; f.roomObjects.courier = creep;
  transfer(creep,{ id: 'spawn',resourceType: 'energy',amount: 400 },f.scope); expect(model.deposit('spawn',400,1,'trip')).toBe(300);
  expect(creep.store.energy).toBe(100); compare(model,f.roomObjects);
  charge(f.roomObjects.spawn,200,undefined,f.scope); model.charge('spawn',200,2,'next');
  transfer(creep,{ id: 'spawn',resourceType: 'energy',amount: 100 },f.scope); expect(model.deposit('spawn',100,2,'trip')).toBe(100); compare(model,f.roomObjects);
}));
test('reservation-aware admission refuses a native debit that would consume another owner stock',() => withProcessors(({ charge }) => {
  const f = fixture(); f.layout.structures[0].reservedEnergy = 100; const model = createStartupEnergyLedger(f.layout);
  expect(charge(f.roomObjects.spawn,250,undefined,f.scope)).toBe(true); expect(f.roomObjects.spawn.store.energy).toBe(50);
  expect(model.charge('spawn',250,0,'unsafe')).toBe(false); expect(model.result().points[0].energy).toBe(300);
}));

test('shared explicit SDK policy resolves equal-range ties identically in forecast and pinned processor',() => withProcessors(({ charge }) => {
  const f = fixture(); f.roomObjects.far.x = 9;
  const points = Object.values(f.roomObjects).map(point => ({ id: point._id,structureType: point.type,my: true,isActive: () => true,pos: { roomName: point.room,x: point.x,y: point.y } }));
  const order = orderedSpawnEnergy(points.find(point => point.id === 'spawn'),points).map(point => point.id);
  expect(order).toEqual(['spawn','second','far','near']); f.layout.orders[0].structures = order;
  const model = createStartupEnergyLedger(f.layout); expect(model.charge('spawn',450,0,'birth')).toBe(charge(f.roomObjects.spawn,450,order,f.scope)); compare(model,f.roomObjects);
}));
