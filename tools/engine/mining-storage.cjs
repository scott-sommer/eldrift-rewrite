const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { miningWorld } = require('./mining.cjs');
async function miningStorageWorld(server, bot) {
  await miningWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 4 } });
  await db['rooms.objects'].update({ room: 'W0N1', name: 'miner' }, { $set: { x: 20, y: 21 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 22, {
    user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
  const terrain = new TerrainMatrix();
  for (const [x, y] of [[19, 19], [20, 19], [21, 19], [19, 20], [21, 20], [19, 21], [21, 21]]) terrain.set(x, y, 'wall');
  await server.world.setTerrain('W0N1', terrain);
}
function verifyMiningStorage(memory) {
  assert.deepEqual(memory.miningEvidence.positions, Array(5).fill([20, 21]));
  assert.deepEqual(memory.miningEvidence.stores, [[48, 0], [50, 0], [0, 50], [2, 50], [4, 50]]);
  assert.deepEqual(memory.miningEvidence.outcomes, Array(5).fill('running'));
  const station = memory.eldrift.records['mining-stations/W0N1'].data.stations[0];
  assert.ok(station.storage);
  assert.equal(station.container, undefined);
  assert.equal(station.link, undefined);
}
module.exports = { miningStorageWorld, verifyMiningStorage };
