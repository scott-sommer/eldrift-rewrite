const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function pickupAdmissionWorld(server, bot) {
  await resourceWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'energy', 20, 19, { energy: 1000, resourceType: 'energy' });
}
function verifyPickupAdmission(memory) {
  assert.deepEqual(memory.pickupAdmission, [[0, 0], [50, 0], [0, 50], [0, 50]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.deepEqual(records.map(record => record.receipts.map(receipt => receipt.amount)), [[], [50]]);
  assert.deepEqual(records.map(record => record.cancelled), [false, false]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { pickupAdmissionWorld, verifyPickupAdmission };
