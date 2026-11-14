const assert = require('node:assert/strict');
async function fillHaulingSink(server, index) {
  if (index !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { energy: 2000 } } });
}
function verifyFullSink(memory) {
  assert.deepEqual(memory.missingSink, [[30, 0, 0, 0], [0, 30, 2000, 0], [0, 30, 2000, 0], [0, 0, 2000, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.equal(records[0].cancelled, true);
  assert.deepEqual(records[0].receipts, []);
  assert.deepEqual(records[1].receipts.map(item => item.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { fillHaulingSink, verifyFullSink };
