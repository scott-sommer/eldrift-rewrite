import { createRequire } from 'node:module';
import { expect,test } from 'vitest';
import { nativeBuildProfile } from '../../src/adapters/screeps/build-profile';
import { energyBuildEffect } from '../../src/capabilities/construction/build-effect';
const require = createRequire(new URL('./package.json',import.meta.url));
function compare({ energy = 20,remaining = 100,body = [{ type: 'work',hits: 100 }] }) {
  const utils = require('@screeps/engine/src/utils'),constants = require('@screeps/common/lib/constants');
  const driver = utils.getDriver,boosts = globalThis.BOOSTS;
  utils.getDriver = () => ({ constants }); globalThis.BOOSTS = constants.BOOSTS;
  try {
    const miner = { _id: 'miner',type: 'creep',user: 'self',room: 'W0N1',x: 10,y: 10,body,store: { energy },actionLog: {} };
    const site = { _id: 'site',type: 'constructionSite',structureType: 'container',room: 'W0N1',x: 10,y: 10,progress: 5000-remaining,progressTotal: 5000 };
    const scope = { roomObjects: { miner,site },roomTerrain: '0'.repeat(2500),gameTime: 100,stats: { inc() {} },eventLog: [],bulk: { update() {},remove() {},insert() {} } };
    const effect = energyBuildEffect(nativeBuildProfile(body),site.progress,site.progressTotal,energy);
    require('@screeps/engine/src/processor/intents/creeps/build')(miner,{ id: 'site' },scope);
    expect(effect.energySpent).toBe(energy-miner.store.energy);
    expect(effect.progressAdded).toBe(site.progress-(5000-remaining));
  } finally {
    utils.getDriver = driver;
    if (boosts === undefined) delete globalThis.BOOSTS; else globalThis.BOOSTS = boosts;
  }
}
test.each([
  {},{ energy: 1 },{ remaining: 1 },{ energy: 0 },
  { body: [{ type: 'work',hits: 0,boost: 'XLH2O' }] },
  { energy: 1,body: [{ type: 'work',hits: 100,boost: 'XLH2O' },{ type: 'work',hits: 0,boost: 'XLH2O' }] },
  { energy: 2,body: [{ type: 'work',hits: 100,boost: 'LH' },{ type: 'work',hits: 100,boost: 'XLH2O' }] },
  { remaining: 3,body: [{ type: 'work',hits: 100,boost: 'XLH2O' }] },
])('construction energy and boosted progress match the pinned processor: %j',compare);
