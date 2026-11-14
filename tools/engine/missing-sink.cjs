const assert = require('node:assert/strict');
async function removeHaulingSink(server, index) {
  if (index !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container', x: 21 });
}
function verifyMissingSink(memory) {
  assert.deepEqual(memory.missingSink, [[30, 0, 0, 0], [0, 30, -1, 0], [0, 30, -1, 0], [0, 0, -1, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.equal(records[0].cancelled, true);
  assert.deepEqual(records[0].receipts, []);
  assert.deepEqual(records[1].receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { removeHaulingSink, verifyMissingSink };
