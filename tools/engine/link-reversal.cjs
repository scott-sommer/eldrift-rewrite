const assert = require('node:assert/strict');
const { linkServiceWorld } = require('./link-service.cjs');
async function linkReversalWorld(server, bot) {
  await linkServiceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'link', x: 19 }, { $set: { store: { energy: 800 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'link', x: 29 }, { $set: { store: { energy: 400 } } });
}
function verifyLinkReversal(memory) {
  assert.deepEqual(memory.linkReversal, [
    [1000, 0, 800, 400], [1000, 200, 600, 400], [1200, 0, 600, 400], [1200, 0, 600, 400],
    [1000, 200, 600, 400], [1000, 0, 800, 400], [1000, 0, 800, 400], [1000, 0, 800, 400],
  ]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2, 'Stable policy must not oscillate between fill and drain');
  assert.deepEqual(records.map(record => JSON.parse(record.request.id)[0]), ['drain', 'fill']);
  for (const record of records) {
    assert.equal(record.cancelled, false, 'Admitted cargo must finish across policy reversal');
    assert.deepEqual(record.receipts.map(receipt => receipt.amount), [200]);
  }
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  assert.deepEqual(memory.eldrift.records['tasks/courier'].data.queue, []);
}
module.exports = { linkReversalWorld, verifyLinkReversal };
