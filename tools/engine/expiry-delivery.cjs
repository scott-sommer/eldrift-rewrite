const assert = require('node:assert/strict');
function verifyExpiryDelivery(memory) {
  assert.deepEqual(memory.missingSink, [[30, 0, 0, 0], [0, 30, 0, 0], [0, 0, 30, 0], [0, 0, 30, 0]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].cancelled, false);
  assert.deepEqual(records[0].receipts.map(item => item.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { verifyExpiryDelivery };
