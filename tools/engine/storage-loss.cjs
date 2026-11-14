const assert = require('node:assert/strict');
const { cargoRecoveryWorld } = require('./cargo-recovery.cjs');
async function storageLossWorld(server, bot) {
  await cargoRecoveryWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'terminal', 21, 19, { user: bot.id, store: { energy: 0 }, storeCapacity: 300000, hits: 3000, hitsMax: 3000 });
}
async function removeStorage(server, index) {
  if (index !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'storage' });
}
function verifyStorageLoss(memory) {
  assert.deepEqual(memory.storageLoss, [[30, 0, 0, 0], [0, 30, -1, 0], [0, 30, -1, 0], [0, 0, -1, 30]]);
  const records = memory.eldrift.records;
  const requests = records['logistics-requests/W0N1'].data.records;
  assert.equal(requests.length, 2);
  assert.equal(requests[0].cancelled, true);
  assert.deepEqual(requests[0].receipts, []);
  assert.deepEqual(requests[1].receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(records['tasks/hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { storageLossWorld, removeStorage, verifyStorageLoss };
