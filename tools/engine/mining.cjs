const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
async function miningWorld(server, bot) {
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  await server.world.addRoomObject('W0N1', 'source', 20, 20, { energy: 1000, energyCapacity: 1000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N1', 'container', 20, 21, {
    store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
  await server.world.addRoomObject('W0N1', 'creep', 20, 22, {
    name: 'miner', user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
    store: { energy: 48 }, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false,
    fatigue: 0, ageTime: 1500, notifyWhenAttacked: false,
  });
}
function verifyMining(memory) {
  assert.deepEqual(memory.miningEvidence.positions, [[20, 22], [20, 21], [20, 21], [20, 21], [20, 21]]);
  assert.deepEqual(memory.miningEvidence.stores, [[48, 0], [48, 0], [50, 0], [0, 50], [2, 50]]);
  assert.deepEqual(memory.miningEvidence.outcomes, Array(5).fill('running'));
}
module.exports = { miningWorld, verifyMining };
