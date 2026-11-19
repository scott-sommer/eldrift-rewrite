import { createRequire } from 'node:module';
import { expect, test } from 'vitest';
import { energyRepairEffect } from '../../src/capabilities/mining/repair-effect';
import { createStartupContainer } from '../../src/capabilities/economy/startup/container';
const require = createRequire(new URL('./package.json',import.meta.url));
// Run pinned processor functions with controlled clock/bulk ports, not a live server or database.
function withProcessors(run) {
  const utils = require('@screeps/engine/src/utils'), constants = require('@screeps/common/lib/constants');
  const original = utils.getDriver; utils.getDriver = () => ({ constants });
  try { return run({ repair: require('@screeps/engine/src/processor/intents/creeps/repair'),decay: require('@screeps/engine/src/processor/intents/containers/tick'),constants }); }
  finally { utils.getDriver = original; }
}
function fixture(hits = 249950, energy = 5) {
  const container = { _id: 'c',type: 'container',x: 10,y: 10,room: 'W0N1',hits,hitsMax: 250000,store: { energy: 0 },storeCapacity: 2000,nextDecayTime: 101 };
  const creep = { _id: 'u',type: 'creep',x: 10,y: 10,user: 'self',body: [{ type: 'work',hits: 100 }],store: { energy },actionLog: {} };
  const removed = [], drops = [];
  const scope = { roomObjects: { c: container,u: creep },gameTime: 100,roomController: null,eventLog: [],stats: { inc() {} },
    bulk: { update: (object,patch) => Object.assign(object,patch),remove: id => removed.push(id),insert: object => { drops.push({ ...object }); return 'drop-'+drops.length; } } };
  return { container,creep,scope,removed,drops };
}
test('unboosted repair and rounded energy cost match the actual pinned processor',() => withProcessors(({ repair,constants }) => {
  expect(constants.REPAIR_POWER).toBe(100); expect(constants.REPAIR_COST).toBe(0.01);
  for (const hits of [249999,249950,249900,249800]) {
    const f = fixture(hits), expected = energyRepairEffect(1,hits,250000,5);
    repair(f.creep,{ id: 'c' },f.scope);
    expect(f.container.hits).toBe(hits+expected.repairedHits); expect(f.creep.store.energy).toBe(5-expected.energySpent);
  }
}));
test.each([[null,99],[{ level: 6 },499]])('decay countdown and recurrence match the pinned processor for controller %j',(controller,interval) => withProcessors(({ decay,constants }) => {
  expect(constants.CONTAINER_DECAY).toBe(5000); expect(constants.CONTAINER_DECAY_TIME).toBe(100);
  const f = fixture(250000); f.scope.roomController = controller;
  const model = createStartupContainer({ hits: 250000,hitsMax: 250000,decayAmount: 5000,decayIn: 1,decayInterval: interval,repairPolicy: null });
  for (let tick = 100; tick <= 100+interval; tick++) {
    f.scope.gameTime = tick; decay(f.container,f.scope); model.finish(tick,0);
    expect(model.result().hits,'post-action frame '+tick).toBe(f.container.hits);
  }
  expect(model.result()).toMatchObject({ hits: 240000,decayEvents: 2 });
}));
test('native container failure drops stored energy; the forecast records it without free salvage',() => withProcessors(({ decay }) => {
  const f = fixture(5000); f.container.store.energy = 42;
  const model = createStartupContainer({ hits: 5000,hitsMax: 250000,decayAmount: 5000,decayIn: 1,decayInterval: 99,repairPolicy: null });
  decay(f.container,f.scope); expect(model.finish(100,42)).toBe(false);
  expect(f.removed).toContain('c'); expect(f.drops.reduce((sum,drop) => sum+(drop.energy ?? 0),0)).toBe(42);
  expect(model.result()).toMatchObject({ destroyedAt: 101,unrecoveredEnergy: 42,hits: 0 });
}));
