const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function energyLogisticsWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container', x: 21 });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 2 } });
  await server.world.addRoomObject('W0N1', 'extension', 21, 20, {
    user: bot.id, store: { energy: 0 }, storeCapacityResource: { energy: 50 }, hits: 1000, hitsMax: 1000,
  });
}
function verifyEnergyLogistics(memory) {
  assert.deepEqual(memory.energySupply, [[30, 0, 0], [30, 0, 0], [0, 30, 0], [0, 0, 30], [0, 0, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].request.quantity, 30);
  assert.deepEqual(records[0].receipts.map(item => item.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { energyLogisticsWorld, verifyEnergyLogistics };
