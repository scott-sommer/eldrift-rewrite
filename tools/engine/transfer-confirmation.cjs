const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function transferConfirmationWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { energy: 1990 } } });
}
function verifyTransferConfirmation(memory) {
  const evidence = memory.transferEvidence;
  assert.deepEqual(evidence.confirmed, [30, 10, 10]);
  assert.deepEqual(evidence.receipts, [true, false], 'Replayed native result must not double-count delivery');
  assert.equal(evidence.duplicateBlocked, true);
  assert.deepEqual(evidence.stores, [[30, 0, 1990], [0, 30, 1990], [0, 20, 2000], [0, 20, 2000]]);
  const record = memory.eldrift.records['logistics-requests/W0N1'].data.records[0];
  assert.equal(record.receipts.length, 1);
  assert.equal(record.receipts[0].amount, 10);
}
module.exports = { transferConfirmationWorld, verifyTransferConfirmation };
