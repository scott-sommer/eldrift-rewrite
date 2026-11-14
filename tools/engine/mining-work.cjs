const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function miningWorkWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  for (const [name, x] of [['maintain', 20], ['establish', 30], ['retreat', 40]]) {
    await server.world.addRoomObject('W0N1', 'source', x, 20, { energy: 1000, energyCapacity: 3000 });
    await server.world.addRoomObject('W0N1', 'creep', x, 21, {
      name, user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
      store: { energy: 20 }, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
      fatigue: 0, ageTime: 1500, notifyWhenAttacked: false,
    });
  }
  await server.world.addRoomObject('W0N1', 'container', 20, 21, {
    store: {}, storeCapacity: 2000, hits: 1000, hitsMax: 250000, nextDecayTime: 1000,
  });
  await server.world.addRoomObject('W0N1', 'constructionSite', 30, 21, {
    structureType: 'container', user: bot.id, progress: 0, progressTotal: 5000,
  });
}
function verifyMiningWork(memory) {
  assert.deepEqual(memory.miningWork.hits, [1000, 1100, 1200]);
  assert.deepEqual(memory.miningWork.progress, [0, 5, 10]);
  assert.deepEqual(memory.miningWork.retreat, [[40, 21, 20], [39, 21, 20], [39, 21, 20]]);
  assert.ok(memory.miningWork.outcomes.every(outcome => outcome === 'running'));
}
module.exports = { miningWorkWorld, verifyMiningWork };
