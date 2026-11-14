const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function colonyMiningWorld(server) {
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await server.world.addRoomObject('W0N1', 'source', 18, 15, { energy: 600, energyCapacity: 600 });
  await server.world.addRoomObject('W0N1', 'container', 17, 15, {
    store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
}
function verifyColonyMining(memory) {
  assert.equal(memory.colonyMining.accepted, 1, 'Source capacity must prevent redundant spawning');
  assert.equal(memory.colonyMining.workers, 1);
  assert.equal(memory.colonyMining.queued, 4, 'Owned source supports five one-WORK miners; one is already live');
  assert.ok(memory.colonyMining.delivered >= 50, 'Spawned miner must travel, harvest and deliver');
}
module.exports = { colonyMiningWorld, verifyColonyMining };


