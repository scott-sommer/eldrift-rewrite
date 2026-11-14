const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function cargoRecoveryWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 19, {
    user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
}
function verifyCargoRecovery(memory) {
  assert.deepEqual(memory.cargoRecovery, [[30, 0, 0, 0], [0, 30, 0, 0], [0, 30, 0, 0], [0, 0, 0, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.equal(records[0].cancelled, true);
  assert.deepEqual(records[0].receipts, []);
  assert.deepEqual(records[1].receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { cargoRecoveryWorld, verifyCargoRecovery };
