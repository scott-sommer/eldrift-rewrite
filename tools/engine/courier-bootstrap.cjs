const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { energyLogisticsWorld } = require('./energy-logistics.cjs');
async function courierBootstrapWorld(server, bot) {
  await energyLogisticsWorld(server, bot);
  await server.world.setTerrain('W0N1', new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'creep' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container' }, { $set: { x: 16, y: 15 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'extension' }, { $set: { x: 17, y: 15 } });
}
function verifyCourierBootstrap(memory) {
  assert.deepEqual(memory.courierBootstrap, { workers: 1, source: 0, delivered: 30 });
  assert.deepEqual(memory.eldrift.records['spawning/W0N1'].data.requests, []);
  const requests = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(requests.length, 1);
  assert.equal(requests[0].receipts.reduce((sum, item) => sum + item.amount, 0), 30);
}
module.exports = { courierBootstrapWorld, verifyCourierBootstrap };
